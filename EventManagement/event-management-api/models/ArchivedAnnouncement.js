import mongoose from "mongoose";

/* =====================================================
   ARCHIVED IMAGE
===================================================== */

const archivedImageFileSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String,
        default: "",
      },

      fileName: {
        type: String,
        default: "",
      },

      mimeType: {
        type: String,
        default: "",
      },

      size: {
        type: Number,
        default: 0,
      },

      /*
        Actual image bytes.

        Stored in MongoDB so archived
        images do not depend on Vercel
        filesystem storage.
      */
      data: {
        type: Buffer,
        default: null,
        select: false,
      },
    },
    {
      _id: false,
    }
  );

/* =====================================================
   ARCHIVED ANNOUNCEMENT
===================================================== */

const archivedAnnouncementSchema =
  new mongoose.Schema(
    {
      /*
        ID of the original Announcement.

        Used when restoring.
      */
      originalAnnouncementId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        required: true,

        unique: true,

        index: true,
      },

      organization: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Organization",

        required: true,
      },

      createdBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      type: {
        type: String,

        enum: [
          "Announcement",
          "News",
        ],

        required: true,
      },

      title: {
        type: String,

        required: true,

        trim: true,
      },

      content: {
        type: String,

        required: true,

        trim: true,
      },

      eventDate: {
        type: String,

        default: "",
      },

      imageFile: {
        type:
          archivedImageFileSchema,

        default: null,
      },

      /*
        Preserve the old status.

        Usually approved or rejected.
      */
      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
        ],

        default:
          "approved",
      },

      adminRemarks: {
        type: String,

        default: "",
      },

      reviewedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      reviewedAt: {
        type: Date,

        default: null,
      },

      publishedAt: {
        type: Date,

        default: null,
      },

      /*
        Preserve original timestamps.
      */

      originalCreatedAt: {
        type: Date,

        default: null,
      },

      originalUpdatedAt: {
        type: Date,

        default: null,
      },

      archivedAt: {
        type: Date,

        default:
          Date.now,
      },
    },
    {
      timestamps:
        true,
    }
  );

/* =====================================================
   MODEL
===================================================== */

export default mongoose.model(
  "ArchivedAnnouncement",
  archivedAnnouncementSchema
);