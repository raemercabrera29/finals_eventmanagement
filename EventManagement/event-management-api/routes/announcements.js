import express from "express";
import multer from "multer";

import Announcement from "../models/Announcement.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =====================================================
   SETTINGS
===================================================== */

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/* =====================================================
   MULTER

   IMPORTANT:

   Do NOT use diskStorage on Vercel.

   The uploaded image stays in memory
   and is immediately stored in MongoDB.
===================================================== */

const storage =
  multer.memoryStorage();

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_IMAGE_SIZE,
    },

    fileFilter(
      req,
      file,
      callback
    ) {
      if (
        !allowedImageTypes.includes(
          file.mimetype
        )
      ) {
        return callback(
          new Error(
            "Only JPG, PNG, and WEBP images are allowed."
          )
        );
      }

      callback(
        null,
        true
      );
    },
  });

/* =====================================================
   CREATE IMAGE FILE NAME

   This is metadata only.

   No physical file is created.
===================================================== */

function createImageFileName(
  file
) {
  let extension =
    "";

  if (
    file.mimetype ===
    "image/jpeg"
  ) {
    extension =
      ".jpg";
  } else if (
    file.mimetype ===
    "image/png"
  ) {
    extension =
      ".png";
  } else if (
    file.mimetype ===
    "image/webp"
  ) {
    extension =
      ".webp";
  }

  const originalName =
    String(
      file.originalname ||
        "announcement-image"
    );

  const cleanName =
    originalName
      .replace(
        /\.[^/.]+$/,
        ""
      )
      .replace(
        /[^a-zA-Z0-9-_]/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        80
      ) ||
    "announcement-image";

  return `${Date.now()}-${Math.round(
    Math.random() *
      1e9
  )}-${cleanName}${extension}`;
}

/* =====================================================
   SERIALIZE ANNOUNCEMENT

   We NEVER return the raw MongoDB
   image buffer in normal JSON.

   Instead, React receives:

   image:
   /api/announcements/:id/image
===================================================== */

function serializeAnnouncement(
  req,
  announcement
) {
  const item =
    typeof announcement
      ?.toObject ===
    "function"
      ? announcement.toObject()
      : {
          ...announcement,
        };

  /*
    Remove the binary image from
    normal JSON responses.
  */

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
        ?.data &&
        item.imageFile
          ?.size >
          0
    ) ||
    Boolean(
      item.imageFile
        ?.fileName &&
        item.imageFile
          ?.size >
          0
    );

  const image =
    hasImage
      ? `${req.protocol}://${req.get(
          "host"
        )}/api/announcements/${item._id}/image`
      : null;

  return {
    ...item,

    imageFile:
      safeImageFile,

    /*
      Frontend can display this
      directly in an <img>.
    */

    image,

    /*
      Compatibility field for
      StudentHome sorting/display.
    */

    date:
      item.eventDate ||
      item.publishedAt ||
      item.createdAt,
  };
}

/* =====================================================
   PUBLIC
   APPROVED POSTS ONLY

   GET /api/announcements
===================================================== */

router.get(
  "/",

  async (
    req,
    res
  ) => {
    try {
      const announcements =
        await Announcement.find({
          status:
            "approved",
        })
          /*
            Do not load large image
            buffers for the post list.
          */

          .select(
            "-imageFile.data"
          )

          .populate(
            "organization",

            "organizationName acronym color"
          )

          .sort({
            publishedAt:
              -1,

            createdAt:
              -1,
          });

      return res.json(
        announcements.map(
          (
            announcement
          ) =>
            serializeAnnouncement(
              req,
              announcement
            )
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Public announcements error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load announcements.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   ALL POSTS

   GET /api/announcements/admin
===================================================== */

router.get(
  "/admin",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const announcements =
        await Announcement.find()
          .select(
            "-imageFile.data"
          )

          .populate(
            "organization",

            "organizationName acronym color email"
          )

          .populate(
            "reviewedBy",

            "username"
          )

          .sort({
            createdAt:
              -1,
          });

      return res.json(
        announcements.map(
          (
            announcement
          ) =>
            serializeAnnouncement(
              req,
              announcement
            )
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Admin announcements error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load post submissions.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   OWN SUBMISSIONS

   GET /api/announcements/my
===================================================== */

router.get(
  "/my",

  protect,

  authorize(
    "organization"
  ),

  async (
    req,
    res
  ) => {
    try {
      if (
        !req.user
          .organization
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      const announcements =
        await Announcement.find({
          organization:
            req.user
              .organization,
        })
          .select(
            "-imageFile.data"
          )

          .populate(
            "organization",

            "organizationName acronym color"
          )

          .sort({
            createdAt:
              -1,
          });

      return res.json(
        announcements.map(
          (
            announcement
          ) =>
            serializeAnnouncement(
              req,
              announcement
            )
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Organization posts error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load your post submissions.",
        });
    }
  }
);

/* =====================================================
   IMAGE

   GET /api/announcements/:id/image

   Reads the image directly from
   MongoDB instead of Vercel disk.
===================================================== */

router.get(
  "/:id/image",

  async (
    req,
    res
  ) => {
    try {
      const announcement =
        await Announcement.findById(
          req.params.id
        ).select(
          "imageFile"
        );

      if (
        !announcement ||
        !announcement
          .imageFile
      ) {
        return res
          .status(404)
          .json({
            message:
              "Image not found.",
          });
      }

      const imageData =
        announcement
          .imageFile
          .data;

      if (
        !imageData ||
        imageData.length ===
          0
      ) {
        return res
          .status(404)
          .json({
            message:
              "Image data not found.",
          });
      }

      const mimeType =
        announcement
          .imageFile
          .mimeType ||
        "application/octet-stream";

      const imageBuffer =
        Buffer.from(
          imageData
        );

      res.setHeader(
        "Content-Type",
        mimeType
      );

      res.setHeader(
        "Content-Length",
        imageBuffer.length
      );

      /*
        Cache image for one hour.
      */

      res.setHeader(
        "Cache-Control",
        "public, max-age=3600"
      );

      return res.end(
        imageBuffer
      );
    } catch (
      error
    ) {
      console.error(
        "Announcement image error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to load image.",
        });
    }
  }
);

/* =====================================================
   ORGANIZATION
   SUBMIT POST

   POST /api/announcements

   Status is always pending.
===================================================== */

router.post(
  "/",

  protect,

  authorize(
    "organization"
  ),

  upload.single(
    "image"
  ),

  async (
    req,
    res
  ) => {
    try {
      const {
        type,
        title,
        content,
        eventDate,
      } =
        req.body;

      /* ===============================================
         ORGANIZATION LINK
      =============================================== */

      if (
        !req.user
          .organization
      ) {
        return res
          .status(400)
          .json({
            message:
              "Your account is not linked to an organization.",
          });
      }

      /* ===============================================
         NORMALIZE VALUES
      =============================================== */

      const cleanType =
        String(
          type ||
            ""
        ).trim();

      const cleanTitle =
        String(
          title ||
            ""
        ).trim();

      const cleanContent =
        String(
          content ||
            ""
        ).trim();

      const cleanEventDate =
        String(
          eventDate ||
            ""
        ).trim();

      /* ===============================================
         REQUIRED
      =============================================== */

      if (
        !cleanType ||
        !cleanTitle ||
        !cleanContent
      ) {
        return res
          .status(400)
          .json({
            message:
              "Post Type, Title, and Content are required.",
          });
      }

      /* ===============================================
         TYPE
      =============================================== */

      if (
        ![
          "Announcement",
          "News",
        ].includes(
          cleanType
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid post type.",
          });
      }

      /* ===============================================
         TITLE VALIDATION
      =============================================== */

      if (
        cleanTitle.length <
        3
      ) {
        return res
          .status(400)
          .json({
            message:
              "Title must contain at least 3 characters.",
          });
      }

      if (
        cleanTitle.length >
        150
      ) {
        return res
          .status(400)
          .json({
            message:
              "Title must not exceed 150 characters.",
          });
      }

      /* ===============================================
         CONTENT VALIDATION
      =============================================== */

      if (
        cleanContent.length <
        5
      ) {
        return res
          .status(400)
          .json({
            message:
              "Content must contain at least 5 characters.",
          });
      }

      if (
        cleanContent.length >
        5000
      ) {
        return res
          .status(400)
          .json({
            message:
              "Content must not exceed 5000 characters.",
          });
      }

      /* ===============================================
         EVENT DATE VALIDATION

         Optional, but if supplied it
         must use YYYY-MM-DD.
      =============================================== */

      if (
        cleanEventDate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(
          cleanEventDate
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid event date.",
          });
      }

      /* ===============================================
         IMAGE

         req.file.buffer comes from
         multer.memoryStorage().
      =============================================== */

      let imageFile =
        null;

      if (
        req.file
      ) {
        if (
          !req.file
            .buffer ||
          req.file
            .buffer
            .length ===
            0
        ) {
          return res
            .status(400)
            .json({
              message:
                "The uploaded image is empty.",
            });
        }

        imageFile = {
          originalName:
            req.file
              .originalname,

          fileName:
            createImageFileName(
              req.file
            ),

          mimeType:
            req.file
              .mimetype,

          size:
            req.file
              .size,

          /*
            Actual image bytes.
          */

          data:
            req.file
              .buffer,
        };
      }

      /* ===============================================
         CREATE PENDING POST
      =============================================== */

      const announcement =
        await Announcement.create({
          organization:
            req.user
              .organization,

          createdBy:
            req.user
              ._id ||
            req.user
              .id ||
            null,

          type:
            cleanType,

          title:
            cleanTitle,

          content:
            cleanContent,

          eventDate:
            cleanEventDate,

          imageFile,

          status:
            "pending",

          adminRemarks:
            "",

          reviewedBy:
            null,

          reviewedAt:
            null,

          publishedAt:
            null,
        });

      /*
        Re-read without the image
        bytes before sending JSON.
      */

      const populated =
        await Announcement.findById(
          announcement._id
        )
          .select(
            "-imageFile.data"
          )

          .populate(
            "organization",

            "organizationName acronym color"
          );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Post submitted successfully. It is now waiting for Administrator review.",

          announcement:
            serializeAnnouncement(
              req,
              populated
            ),
        });
    } catch (
      error
    ) {
      console.error(
        "Create announcement error:",
        error
      );

      /*
        MongoDB document limit.
      */

      if (
        error?.code ===
        10334
      ) {
        return res
          .status(400)
          .json({
            message:
              "The announcement is too large. Please upload a smaller image.",
          });
      }

      return res
        .status(500)
        .json({
          message:
            error.message ||
            "Unable to submit post.",
        });
    }
  }
);

/* =====================================================
   ADMIN
   APPROVE / REJECT

   PATCH /api/announcements/:id/status
===================================================== */

router.patch(
  "/:id/status",

  protect,

  authorize(
    "admin"
  ),

  async (
    req,
    res
  ) => {
    try {
      const status =
        String(
          req.body
            .status ||
            ""
        )
          .trim()
          .toLowerCase();

      const adminRemarks =
        String(
          req.body
            .adminRemarks ||
            ""
        ).trim();

      /* ===============================================
         STATUS VALIDATION
      =============================================== */

      if (
        ![
          "approved",
          "rejected",
        ].includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Status must be approved or rejected.",
          });
      }

      /* ===============================================
         REJECTION REASON
      =============================================== */

      if (
        status ===
          "rejected" &&
        !adminRemarks
      ) {
        return res
          .status(400)
          .json({
            message:
              "Please enter a reason for rejecting the post.",
          });
      }

      /* ===============================================
         FIND ANNOUNCEMENT
      =============================================== */

      const announcement =
        await Announcement.findById(
          req.params.id
        );

      if (
        !announcement
      ) {
        return res
          .status(404)
          .json({
            message:
              "Post not found.",
          });
      }

      /* ===============================================
         UPDATE
      =============================================== */

      announcement.status =
        status;

      announcement.adminRemarks =
        adminRemarks;

      announcement.reviewedBy =
        req.user._id ||
        req.user.id ||
        null;

      announcement.reviewedAt =
        new Date();

      announcement.publishedAt =
        status ===
        "approved"
          ? new Date()
          : null;

      await announcement.save();

      /* ===============================================
         POPULATE RESULT

         Exclude large image buffer.
      =============================================== */

      const populated =
        await Announcement.findById(
          announcement._id
        )
          .select(
            "-imageFile.data"
          )

          .populate(
            "organization",

            "organizationName acronym color email"
          )

          .populate(
            "reviewedBy",

            "username"
          );

      return res.json({
        success:
          true,

        message:
          status ===
          "approved"
            ? "Post approved successfully. It is now visible on the Student Homepage."
            : "Post rejected successfully.",

        announcement:
          serializeAnnouncement(
            req,
            populated
          ),
      });
    } catch (
      error
    ) {
      console.error(
        "Announcement review error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Unable to review post.",
        });
    }
  }
);

/* =====================================================
   MULTER / UPLOAD ERRORS
===================================================== */

router.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Image must be 5 MB or smaller.",
          });
      }

      return res
        .status(400)
        .json({
          message:
            error.message,
        });
    }

    if (
      error
    ) {
      return res
        .status(400)
        .json({
          message:
            error.message ||
            "Unable to upload image.",
        });
    }

    next();
  }
);

/* =====================================================
   EXPORT
===================================================== */

export default router;