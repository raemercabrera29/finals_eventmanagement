import express from "express";
import mongoose from "mongoose";

import Announcement from "../models/Announcement.js";

import ArchivedAnnouncement from "../models/ArchivedAnnouncement.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================================
   HELPERS
===================================================== */

function validObjectId(
  value
) {
  return mongoose.isValidObjectId(
    value
  );
}

/* =====================================================
   BASE URL

   Needed so archived images point
   to the backend Vercel URL.
===================================================== */

function getBaseUrl(
  req
) {
  const forwardedProtocol =
    req.get(
      "x-forwarded-proto"
    );

  const protocol =
    forwardedProtocol
      ? forwardedProtocol
          .split(",")[0]
          .trim()
      : req.protocol ||
        "https";

  const host =
    req.get(
      "host"
    );

  return `${protocol}://${host}`;
}

/* =====================================================
   COPY IMAGE FILE

   Keeps Buffer stored in MongoDB.
===================================================== */

function copyImageFile(
  imageFile
) {
  if (
    !imageFile
  ) {
    return null;
  }

  const image =
    typeof imageFile
      ?.toObject ===
    "function"
      ? imageFile.toObject()
      : imageFile;

  let data =
    null;

  if (
    image?.data
  ) {
    data =
      Buffer.isBuffer(
        image.data
      )
        ? image.data
        : Buffer.from(
            image.data
          );
  }

  return {
    originalName:
      image
        ?.originalName ||
      "",

    fileName:
      image
        ?.fileName ||
      "",

    mimeType:
      image
        ?.mimeType ||
      "",

    size:
      Number(
        image?.size ||
          0
      ),

    data,
  };
}

/* =====================================================
   SERIALIZE ARCHIVE

   Do not send the raw Buffer in JSON.
===================================================== */

function serializeArchive(
  req,
  archive
) {
  const item =
    typeof archive
      ?.toObject ===
    "function"
      ? archive.toObject()
      : {
          ...archive,
        };

  let safeImageFile =
    null;

  if (
    item.imageFile
  ) {
    const {
      data,
      ...metadata
    } =
      item.imageFile;

    safeImageFile =
      metadata;
  }

  const hasImage =
    Boolean(
      item.imageFile
        ?.fileName
    ) &&
    Number(
      item.imageFile
        ?.size ||
        0
    ) >
      0;

  return {
    ...item,

    /*
      Frontend helper already supports
      archiveId separately.
    */
    archiveId:
      item._id,

    /*
      Keep original Announcement ID.
    */
    originalAnnouncementId:
      item.originalAnnouncementId,

    isArchived:
      true,

    imageFile:
      safeImageFile,

    /*
      Archived image must use archive ID,
      because the original Announcement
      has already been deleted.
    */
    image:
      hasImage
        ? `${getBaseUrl(
            req
          )}/api/announcement-archive/${item._id}/image`
        : null,
  };
}

/* =====================================================
   LOAD ONE POPULATED ARCHIVE
===================================================== */

async function getPopulatedArchive(
  id
) {
  return ArchivedAnnouncement.findById(
    id
  )
    .populate(
      "organization",

      `
        organizationName
        acronym
        color
        email
        adviser
      `
    )
    .populate(
      "reviewedBy",

      "username"
    );
}

/* =====================================================
   TEST ROUTE

   GET /api/announcement-archive/test
===================================================== */

router.get(
  "/test",

  protect,

  authorize(
    "admin"
  ),

  (
    req,
    res
  ) => {
    return res.json({
      success:
        true,

      message:
        "Announcement archive API is working.",
    });
  }
);

/* =====================================================
   ADMIN
   GET ARCHIVED ANNOUNCEMENTS

   GET /api/announcement-archive
===================================================== */

router.get(
  "/",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const archives =
        await ArchivedAnnouncement.find()
          /*
            Do not return image binary
            in the list response.
          */
          .select(
            "-imageFile.data"
          )

          .populate(
            "organization",

            `
              organizationName
              acronym
              color
              email
              adviser
            `
          )

          .populate(
            "reviewedBy",

            "username"
          )

          .sort({
            archivedAt:
              -1,

            createdAt:
              -1,
          });

      return res.json({
        success:
          true,

        archives:
          archives.map(
            (
              archive
            ) =>
              serializeArchive(
                req,
                archive
              )
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "LOAD ANNOUNCEMENT ARCHIVE ERROR:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            error.message ||
            "Unable to load archived announcements.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   ARCHIVED IMAGE

   GET
   /api/announcement-archive/:archiveId/image
===================================================== */

router.get(
  "/:archiveId/image",

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
        archiveId,
      } =
        req.params;

      if (
        !validObjectId(
          archiveId
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid archive ID.",
          });
      }

      /*
        imageFile.data has select:false,
        so explicitly include it.
      */
      const archive =
        await ArchivedAnnouncement.findById(
          archiveId
        ).select(
          "+imageFile.data"
        );

      if (
        !archive
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Archived post not found.",
          });
      }

      const image =
        archive
          .imageFile;

      if (
        !image ||
        !image.data ||
        image.data.length ===
          0
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Archived image not found.",
          });
      }

      const buffer =
        Buffer.isBuffer(
          image.data
        )
          ? image.data
          : Buffer.from(
              image.data
            );

      res.setHeader(
        "Content-Type",

        image.mimeType ||
          "application/octet-stream"
      );

      res.setHeader(
        "Content-Length",
        buffer.length
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0"
      );

      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );

      return res.end(
        buffer
      );
    } catch (
      error
    ) {
      console.error(
        "LOAD ARCHIVED ANNOUNCEMENT IMAGE ERROR:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            "Unable to load archived image.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   ARCHIVE ANNOUNCEMENT

   POST
   /api/announcement-archive/:announcementId
===================================================== */

router.post(
  "/:announcementId",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    let createdArchive =
      null;

    try {
      const {
        announcementId,
      } =
        req.params;

      /* ===============================================
         VALID ID
      =============================================== */

      if (
        !validObjectId(
          announcementId
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid announcement ID.",
          });
      }

      /* ===============================================
         FIND ANNOUNCEMENT

         Explicitly include image Buffer.
      =============================================== */

      const announcement =
        await Announcement.findById(
          announcementId
        ).select(
          "+imageFile.data"
        );

      if (
        !announcement
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Announcement not found.",
          });
      }

      /* ===============================================
         ONLY COMPLETED POSTS CAN ARCHIVE
      =============================================== */

      const normalizedStatus =
        String(
          announcement
            .status ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        ![
          "approved",
          "rejected",
        ].includes(
          normalizedStatus
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Only approved or rejected posts can be archived.",
          });
      }

      /* ===============================================
         ALREADY ARCHIVED
      =============================================== */

      const existingArchive =
        await ArchivedAnnouncement.findOne({
          originalAnnouncementId:
            announcement
              ._id,
        });

      if (
        existingArchive
      ) {
        return res
          .status(
            409
          )
          .json({
            message:
              "This post is already archived.",
          });
      }

      /* ===============================================
         CREATE ARCHIVE
      =============================================== */

      createdArchive =
        await ArchivedAnnouncement.create({
          originalAnnouncementId:
            announcement
              ._id,

          organization:
            announcement
              .organization,

          createdBy:
            announcement
              .createdBy ||
            null,

          type:
            announcement
              .type,

          title:
            announcement
              .title,

          content:
            announcement
              .content,

          eventDate:
            announcement
              .eventDate ||
            "",

          imageFile:
            copyImageFile(
              announcement
                .imageFile
            ),

          status:
            announcement
              .status,

          adminRemarks:
            announcement
              .adminRemarks ||
            "",

          reviewedBy:
            announcement
              .reviewedBy ||
            null,

          reviewedAt:
            announcement
              .reviewedAt ||
            null,

          publishedAt:
            announcement
              .publishedAt ||
            null,

          originalCreatedAt:
            announcement
              .createdAt ||
            null,

          originalUpdatedAt:
            announcement
              .updatedAt ||
            null,

          archivedAt:
            new Date(),
        });

      /* ===============================================
         DELETE ACTIVE ANNOUNCEMENT
      =============================================== */

      const deleteResult =
        await Announcement.deleteOne({
          _id:
            announcement
              ._id,
        });

      /*
        If deletion somehow fails,
        remove the archive again so
        data is not duplicated.
      */
      if (
        deleteResult
          .deletedCount !==
        1
      ) {
        await ArchivedAnnouncement.findByIdAndDelete(
          createdArchive
            ._id
        );

        return res
          .status(
            409
          )
          .json({
            message:
              "The post changed while archiving. Please refresh and try again.",
          });
      }

      /* ===============================================
         RETURN ARCHIVE
      =============================================== */

      const populated =
        await getPopulatedArchive(
          createdArchive
            ._id
        );

      return res.json({
        success:
          true,

        message:
          "Post moved to Archive successfully.",

        archive:
          serializeArchive(
            req,
            populated
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "ARCHIVE ANNOUNCEMENT ERROR:",
        error
      );

      /*
        Unique originalAnnouncementId
      */
      if (
        error?.code ===
        11000
      ) {
        return res
          .status(
            409
          )
          .json({
            message:
              "This post is already archived.",
          });
      }

      return res
        .status(
          500
        )
        .json({
          message:
            error.message ||
            "Unable to archive post.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   RESTORE ARCHIVED ANNOUNCEMENT

   POST
   /api/announcement-archive/:archiveId/restore
===================================================== */

router.post(
  "/:archiveId/restore",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    let restoredAnnouncement =
      null;

    try {
      const {
        archiveId,
      } =
        req.params;

      /* ===============================================
         VALID ID
      =============================================== */

      if (
        !validObjectId(
          archiveId
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid archive ID.",
          });
      }

      /* ===============================================
         LOAD ARCHIVE WITH IMAGE
      =============================================== */

      const archive =
        await ArchivedAnnouncement.findById(
          archiveId
        ).select(
          "+imageFile.data"
        );

      if (
        !archive
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Archived post not found.",
          });
      }

      /* ===============================================
         CHECK ORIGINAL
      =============================================== */

      const existing =
        await Announcement.findById(
          archive
            .originalAnnouncementId
        );

      if (
        existing
      ) {
        return res
          .status(
            409
          )
          .json({
            message:
              "The original post already exists in Announcements.",
          });
      }

      /* ===============================================
         RESTORE ANNOUNCEMENT
      =============================================== */

      restoredAnnouncement =
        await Announcement.create({
          /*
            Restore the original MongoDB
            ID so existing references stay
            consistent.
          */
          _id:
            archive
              .originalAnnouncementId,

          organization:
            archive
              .organization,

          createdBy:
            archive
              .createdBy ||
            null,

          type:
            archive
              .type,

          title:
            archive
              .title,

          content:
            archive
              .content,

          eventDate:
            archive
              .eventDate ||
            "",

          imageFile:
            copyImageFile(
              archive
                .imageFile
            ),

          status:
            archive
              .status ||
            "approved",

          adminRemarks:
            archive
              .adminRemarks ||
            "",

          reviewedBy:
            archive
              .reviewedBy ||
            null,

          reviewedAt:
            archive
              .reviewedAt ||
            null,

          publishedAt:
            archive
              .publishedAt ||
            null,

          /*
            Preserve original dates when
            available.
          */
          createdAt:
            archive
              .originalCreatedAt ||
            undefined,

          updatedAt:
            archive
              .originalUpdatedAt ||
            undefined,
        });

      /* ===============================================
         DELETE ARCHIVE AFTER RESTORE
      =============================================== */

      const deleteResult =
        await ArchivedAnnouncement.deleteOne({
          _id:
            archive
              ._id,
        });

      /*
        Roll back restored announcement
        if archive removal fails.
      */
      if (
        deleteResult
          .deletedCount !==
        1
      ) {
        await Announcement.findByIdAndDelete(
          restoredAnnouncement
            ._id
        );

        return res
          .status(
            409
          )
          .json({
            message:
              "The archive changed while restoring. Please refresh and try again.",
          });
      }

      /* ===============================================
         POPULATE RESTORED POST
      =============================================== */

      const populated =
        await Announcement.findById(
          restoredAnnouncement
            ._id
        )
          .select(
            "-imageFile.data"
          )

          .populate(
            "organization",

            `
              organizationName
              acronym
              color
              email
              adviser
            `
          )

          .populate(
            "reviewedBy",

            "username"
          );

      return res.json({
        success:
          true,

        message:
          "Post restored successfully.",

        announcement:
          populated,
      });
    } catch (
      error
    ) {
      console.error(
        "RESTORE ANNOUNCEMENT ERROR:",
        error
      );

      /*
        If creation failed because the
        restored ID already exists.
      */
      if (
        error?.code ===
        11000
      ) {
        return res
          .status(
            409
          )
          .json({
            message:
              "The original post already exists.",
          });
      }

      return res
        .status(
          500
        )
        .json({
          message:
            error.message ||
            "Unable to restore archived post.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   PERMANENTLY DELETE ARCHIVED POST

   DELETE
   /api/announcement-archive/:archiveId
===================================================== */

router.delete(
  "/:archiveId",

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
        archiveId,
      } =
        req.params;

      /* ===============================================
         VALID ID
      =============================================== */

      if (
        !validObjectId(
          archiveId
        )
      ) {
        return res
          .status(
            400
          )
          .json({
            message:
              "Invalid archive ID.",
          });
      }

      /* ===============================================
         FIND ARCHIVE
      =============================================== */

      const archive =
        await ArchivedAnnouncement.findById(
          archiveId
        );

      if (
        !archive
      ) {
        return res
          .status(
            404
          )
          .json({
            message:
              "Archived post not found.",
          });
      }

      /* ===============================================
         DELETE
      =============================================== */

      await ArchivedAnnouncement.deleteOne({
        _id:
          archive
            ._id,
      });

      return res.json({
        success:
          true,

        message:
          "Archived post permanently deleted.",
      });
    } catch (
      error
    ) {
      console.error(
        "DELETE ANNOUNCEMENT ARCHIVE ERROR:",
        error
      );

      return res
        .status(
          500
        )
        .json({
          message:
            error.message ||
            "Unable to permanently delete archived post.",
        });
    }
  }
);

/* =====================================================
   EXPORT
===================================================== */

export default router;