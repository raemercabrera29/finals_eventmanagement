import mongoose from "mongoose";

/* =====================================================
   IMAGE FILE
===================================================== */

const imageFileSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String,
        default: "",
      },

      /*
        Kept as metadata.

        This is NOT a physical file
        on the Vercel filesystem.
      */

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
        IMPORTANT:

        The actual image bytes are
        stored directly in MongoDB.

        This replaces writing to:

        uploads/announcement-images

        which does not work reliably
        on Vercel's read-only runtime.
      */

      data: {
        type: Buffer,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

/* =====================================================
   ANNOUNCEMENT
===================================================== */

const announcementSchema =
  new mongoose.Schema(
    {
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

        maxlength: 150,
      },

      content: {
        type: String,

        required: true,

        trim: true,

        maxlength: 5000,
      },

      /*
        YYYY-MM-DD

        Kept as String to prevent
        timezone date shifting.
      */

      eventDate: {
        type: String,
        default: "",
      },

      /*
        Optional announcement image.
      */

      imageFile: {
        type: imageFileSchema,
        default: null,
      },

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
        ],

        default: "pending",
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
    },
    {
      timestamps: true,
    }
  );

/* =====================================================
   MODEL
===================================================== */

export default mongoose.model(
  "Announcement",
  announcementSchema
);