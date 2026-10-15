import mongoose from "mongoose";

/* =====================================================
   BOOKING DOCUMENT
===================================================== */

const bookingDocumentSchema =
  new mongoose.Schema(
    {
      originalName: {
        type: String,
        required: true,
      },

      /*
        Metadata only.

        No physical file is written
        to the Vercel filesystem.
      */
      fileName: {
        type: String,
        required: true,
      },

      mimeType: {
        type: String,
        required: true,
      },

      size: {
        type: Number,
        default: 0,
      },

      /*
        Actual PDF bytes.

        Stored directly inside MongoDB.

        select:false prevents the large
        binary data from being included
        in normal booking API responses.
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
   BOOKING
===================================================== */

const bookingSchema =
  new mongoose.Schema(
    {
      bookingReference: {
        type: String,
        unique: true,
      },

      organization: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Organization",

        required: true,
      },

      eventName: {
        type: String,
        required: true,
        trim: true,
      },

      eventType: {
        type: String,
        default: "",
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      venue: {
        type: String,
        required: true,
        trim: true,
      },

      eventDate: {
        type: Date,
        required: true,
      },

      startTime: {
        type: String,
        required: true,
      },

      endTime: {
        type: String,
        required: true,
      },

      participants: {
        type: Number,
        default: 0,
        min: 0,
        max: 150,
      },

      request: {
        type: String,
        default: "",
        trim: true,
      },

      /* =================================================
         REQUIRED DOCUMENTS
      ================================================= */

      projectProposalFile: {
        type:
          bookingDocumentSchema,

        required: true,
      },

      approvedArfFile: {
        type:
          bookingDocumentSchema,

        required: true,
      },

      /* =================================================
         STATUS
      ================================================= */

      status: {
        type: String,

        enum: [
          "pending",
          "approved",
          "rejected",
          "cancelled",
        ],

        default:
          "pending",
      },

      adminRemarks: {
        type: String,
        default: "",
      },
    },
    {
      timestamps:
        true,
    }
  );

/* =====================================================
   BOOKING REFERENCE
===================================================== */

bookingSchema.pre(
  "validate",

  function (next) {
    if (
      !this.bookingReference
    ) {
      this.bookingReference =
        `NU-${Date.now()
          .toString()
          .slice(
            -8
          )}-${Math.floor(
          Math.random() *
            900 +
            100
        )}`;
    }

    next();
  }
);

/* =====================================================
   MODEL
===================================================== */

export default mongoose.model(
  "Booking",
  bookingSchema
);