import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  ContainerClient,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import path from 'path';

export interface UploadResult {
  blobName: string;
  url: string;
  contentType: string;
  size: number;
}

export interface SASUrlOptions {
  expiryHours?: number;
  permissions?: string;
}

class AzureBlobService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private sharedKeyCredential: StorageSharedKeyCredential;

  constructor() {
    const { accountName, accountKey, containerName } = config.azure.storage;

    if (!accountName || !accountKey) {
      throw new Error('Azure Storage account name and key must be configured');
    }

    this.sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      this.sharedKeyCredential
    );
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
  }

  async ensureContainerExists(): Promise<void> {
    const exists = await this.containerClient.exists();
    if (!exists) {
      await this.containerClient.create({
        access: 'blob', // Public read access for blobs
      });
      console.log(`✓ Container "${config.azure.storage.containerName}" created`);
    }
  }

  async uploadVideo(
    filePath: string,
    fileName: string,
    contentType: string
  ): Promise<UploadResult> {
    try {
      await this.ensureContainerExists();

      // Generate unique blob name to avoid collisions
      const fileExtension = path.extname(fileName);
      const blobName = `${uuidv4()}${fileExtension}`;

      const blockBlobClient: BlockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      // Upload file with metadata
      const uploadResponse = await blockBlobClient.uploadFile(filePath, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      if (!uploadResponse._response.status || uploadResponse._response.status >= 400) {
        throw new Error(`Upload failed with status: ${uploadResponse._response.status}`);
      }

      const properties = await blockBlobClient.getProperties();

      return {
        blobName,
        url: blockBlobClient.url,
        contentType: properties.contentType || contentType,
        size: properties.contentLength || 0,
      };
    } catch (error) {
      console.error('Error uploading to Azure Blob Storage:', error);
      throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string
  ): Promise<UploadResult> {
    try {
      await this.ensureContainerExists();

      const fileExtension = path.extname(fileName);
      const blobName = `${uuidv4()}${fileExtension}`;

      const blockBlobClient: BlockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      return {
        blobName,
        url: blockBlobClient.url,
        contentType,
        size: buffer.length,
      };
    } catch (error) {
      console.error('Error uploading buffer to Azure Blob Storage:', error);
      throw new Error(`Failed to upload video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  generateSASUrl(blobName: string, options?: SASUrlOptions): string {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      const expiryHours = options?.expiryHours || config.sas.expiryHours;
      const permissions = options?.permissions || config.sas.permissions;

      // Set expiry time
      const startsOn = new Date();
      const expiresOn = new Date(startsOn);
      expiresOn.setHours(expiresOn.getHours() + expiryHours);

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: config.azure.storage.containerName,
          blobName,
          permissions: BlobSASPermissions.parse(permissions),
          startsOn,
          expiresOn,
        },
        this.sharedKeyCredential
      ).toString();

      // Return URL with SAS token
      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      console.error('Error generating SAS URL:', error);
      throw new Error(`Failed to generate SAS URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCDNUrl(blobName: string): string {
    const { endpoint } = config.azure.cdn;

    if (endpoint) {
      return `${endpoint}/${config.azure.storage.containerName}/${blobName}`;
    }

    // Fallback to blob URL if CDN is not configured
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  async deleteVideo(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const deleteResponse = await blockBlobClient.deleteIfExists();
      return deleteResponse.succeeded;
    } catch (error) {
      console.error('Error deleting blob:', error);
      throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async blobExists(blobName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      return await blockBlobClient.exists();
    } catch (error) {
      console.error('Error checking blob existence:', error);
      return false;
    }
  }

  async getVideoMetadata(blobName: string): Promise<Record<string, string> | null> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const properties = await blockBlobClient.getProperties();
      return properties.metadata || null;
    } catch (error) {
      console.error('Error getting video metadata:', error);
      return null;
    }
  }
}

export default new AzureBlobService();
