import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

export enum VideoStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum VideoQuality {
  SD = '480p',
  HD = '720p',
  FULL_HD = '1080p',
  UHD = '2160p',
}

interface VideoAttributes {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  uploaderId: string;
  fileName: string;
  fileUrl: string;
  blobName: string;
  fileSize: number;
  duration: number;
  format: string;
  quality?: VideoQuality;
  thumbnailUrl?: string;
  status: VideoStatus;
  viewCount: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface VideoCreationAttributes extends Optional<VideoAttributes, 'id' | 'description' | 'quality' | 'thumbnailUrl' | 'viewCount' | 'metadata' | 'status'> {}

class Video extends Model<VideoAttributes, VideoCreationAttributes> implements VideoAttributes {
  public id!: string;
  public title!: string;
  public description?: string;
  public courseId!: string;
  public uploaderId!: string;
  public fileName!: string;
  public fileUrl!: string;
  public blobName!: string;
  public fileSize!: number;
  public duration!: number;
  public format!: string;
  public quality?: VideoQuality;
  public thumbnailUrl?: string;
  public status!: VideoStatus;
  public viewCount!: number;
  public metadata?: Record<string, any>;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;
}

Video.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'course_id',
    },
    uploaderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'uploader_id',
    },
    fileName: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_name',
    },
    fileUrl: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'file_url',
    },
    blobName: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
      field: 'blob_name',
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'file_size',
      validate: {
        min: 0,
      },
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: 'Duration in seconds',
    },
    format: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm']],
      },
    },
    quality: {
      type: DataTypes.ENUM(...Object.values(VideoQuality)),
      allowNull: true,
    },
    thumbnailUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'thumbnail_url',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(VideoStatus)),
      allowNull: false,
      defaultValue: VideoStatus.UPLOADING,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'view_count',
      validate: {
        min: 0,
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional video metadata (codec, bitrate, etc.)',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'videos',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        fields: ['course_id'],
      },
      {
        fields: ['uploader_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['blob_name'],
        unique: true,
      },
    ],
  }
);

export default Video;
