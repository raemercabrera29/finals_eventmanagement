import express from "express";

import Booking from "../models/Booking.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================================
   ADMIN VIEW BOOKING DOCUMENT

   GET:
   /api/booking-documents/:bookingId/project-proposal

   GET:
   /api/booking-documents/:bookingId/approved-arf

   PDFs are loaded directly from MongoDB.
===================================================== */

router.get(
  "/:bookingId/:documentType",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        bookingId,
        documentType,
      } =
        req.params;

      /* ===============================================
         VALID DOCUMENT TYPE
      =============================================== */

      if (
        ![
          "project-proposal",
          "approved-arf",
        ].includes(
          documentType
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid document type.",
          });
      }

      /* ===============================================
         LOAD BOOKING

         data fields use select:false
         normally, so explicitly include
         them for this protected route.
      =============================================== */

      const booking =
        await Booking.findById(
          bookingId
        ).select(
          "+projectProposalFile.data +approvedArfFile.data"
        );

      if (
        !booking
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Booking not found.",
          });
      }

      /* ===============================================
         SELECT DOCUMENT
      =============================================== */

      let document =
        null;

      if (
        documentType ===
        "project-proposal"
      ) {
        document =
          booking
            .projectProposalFile;
      }

      if (
        documentType ===
        "approved-arf"
      ) {
        document =
          booking
            .approvedArfFile;
      }

      if (
        !document
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Document not found for this booking.",
          });
      }

      /* ===============================================
         PDF DATA

         Older bookings created before
         this fix may have fileName
         metadata but no MongoDB Buffer.
      =============================================== */

      if (
        !document
          .data ||
        document
          .data
          .length ===
          0
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "This document was uploaded before the Vercel storage fix and is no longer available. Please submit the booking documents again.",
          });
      }

      /* ===============================================
         BUFFER
      =============================================== */

      const pdfBuffer =
        Buffer.isBuffer(
          document
            .data
        )
          ? document
              .data
          : Buffer.from(
              document
                .data
            );

      /* ===============================================
         SAFE FILE NAME
      =============================================== */

      const safeOriginalName =
        String(
          document
            .originalName ||
            "Document.pdf"
        )
          .replace(
            /"/g,
            ""
          )
          .replace(
            /[\r\n]/g,
            ""
          )
          .replace(
            /[^\x20-\x7E]/g,
            "_"
          );

      /* ===============================================
         RESPONSE HEADERS
      =============================================== */

      res.setHeader(
        "Content-Type",
        document
          .mimeType ||
          "application/pdf"
      );

      /*
        inline allows your admin
        PDF preview to display it.
      */
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safeOriginalName}"`
      );

      res.setHeader(
        "Content-Length",
        pdfBuffer.length
      );

      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );

      /*
        Booking documents should not
        be publicly cached.
      */
      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0"
      );

      /* ===============================================
         SEND PDF
      =============================================== */

      return res.end(
        pdfBuffer
      );
    } catch (
      error
    ) {
      console.error(
        "View booking document error:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            error.message ||
            "Unable to open booking document.",
        });
    }
  }
);

export default router;