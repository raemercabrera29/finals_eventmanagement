import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import api from "../../api/axiosClient.js";

import AdminEventCalendar from "../../components/common/AdminEventCalendar.jsx";

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({
  name,
  className = "",
}) {
  return (
    <span
      className={`
        material-symbols-rounded
        leading-none
        ${className}
      `}
    >
      {name}
    </span>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

function formatDate(
  value
) {
  if (!value) {
    return "No date";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}

function formatTime(
  value
) {
  if (!value) {
    return "";
  }

  const parts =
    String(value).split(
      ":"
    );

  if (
    parts.length !==
    2
  ) {
    return value;
  }

  let hours =
    Number(parts[0]);

  const minutes =
    Number(parts[1]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return value;
  }

  const period =
    hours >= 12
      ? "PM"
      : "AM";

  hours =
    hours % 12 ||
    12;

  return `${hours}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )} ${period}`;
}

function getOrganizationName(
  item
) {
  return (
    item?.organization
      ?.organizationName ||
    item?.organizationName ||
    "Organization"
  );
}

function getOrganizationAcronym(
  item
) {
  return (
    item?.organization
      ?.acronym ||
    item?.acronym ||
    ""
  );
}

/* =====================================================
   ADMIN DASHBOARD
===================================================== */

export default function AdminDashboard() {
  const navigate =
    useNavigate();

  /* ===================================================
     STATES
  =================================================== */

  const [
    organizations,
    setOrganizations,
  ] =
    useState([]);

  const [
    bookings,
    setBookings,
  ] =
    useState([]);

  const [
    announcements,
    setAnnouncements,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  /* ===================================================
     LOAD DASHBOARD DATA
  =================================================== */

  const loadDashboard =
    async () => {
      setLoading(true);

      setError("");

      try {
        const [
          organizationsResult,
          bookingsResult,
          announcementsResult,
        ] =
          await Promise.allSettled(
            [
              api.get(
                "/organizations"
              ),

              api.get(
                "/bookings"
              ),

              api.get(
                "/announcements/admin"
              ),
            ]
          );

        /* =============================================
           ORGANIZATIONS
        ============================================= */

        if (
          organizationsResult.status ===
          "fulfilled"
        ) {
          setOrganizations(
            Array.isArray(
              organizationsResult
                .value.data
            )
              ? organizationsResult
                  .value.data
              : []
          );
        } else {
          setOrganizations(
            []
          );
        }

        /* =============================================
           BOOKINGS
        ============================================= */

        if (
          bookingsResult.status ===
          "fulfilled"
        ) {
          setBookings(
            Array.isArray(
              bookingsResult
                .value.data
            )
              ? bookingsResult
                  .value.data
              : []
          );
        } else {
          setBookings(
            []
          );
        }

        /* =============================================
           ANNOUNCEMENTS
        ============================================= */

        if (
          announcementsResult.status ===
          "fulfilled"
        ) {
          setAnnouncements(
            Array.isArray(
              announcementsResult
                .value.data
            )
              ? announcementsResult
                  .value.data
              : []
          );
        } else {
          setAnnouncements(
            []
          );
        }

        /* =============================================
           ERROR ONLY IF EVERYTHING FAILED
        ============================================= */

        if (
          organizationsResult.status ===
            "rejected" &&
          bookingsResult.status ===
            "rejected" &&
          announcementsResult.status ===
            "rejected"
        ) {
          setError(
            "Unable to load dashboard information."
          );
        }
      } catch (
        error
      ) {
        console.error(
          "ADMIN DASHBOARD ERROR:",
          error
        );

        setError(
          "Unable to load dashboard information."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* ===================================================
     COUNTS
  =================================================== */

  const pendingBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            normalizeStatus(
              booking.status
            ) ===
            "pending"
        ),
      [bookings]
    );

  const approvedBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            normalizeStatus(
              booking.status
            ) ===
            "approved"
        ),
      [bookings]
    );

  const publishedPosts =
    useMemo(
      () =>
        announcements.filter(
          (post) =>
            normalizeStatus(
              post.status
            ) ===
            "approved"
        ),
      [announcements]
    );

  /* ===================================================
     STATISTICS
  =================================================== */

  const statistics = [
    {
      title:
        "Organizations",

      value:
        organizations.length,

      icon:
        "groups",
    },

    {
      title:
        "Events",

      value:
        bookings.length,

      icon:
        "event",
    },

    {
      title:
        "Pending Approvals",

      value:
        pendingBookings.length,

      icon:
        "pending_actions",
    },

    {
      title:
        "Published Posts",

      value:
        publishedPosts.length,

      icon:
        "campaign",
    },
  ];

  /* ===================================================
     PENDING APPROVALS

     Show newest first.
  =================================================== */

  const visiblePending =
    useMemo(
      () =>
        [...pendingBookings]
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.createdAt ||
                  0
              ) -
              new Date(
                a.createdAt ||
                  0
              )
          )
          .slice(
            0,
            5
          ),
      [pendingBookings]
    );

  /* ===================================================
     RECENT ACTIVITIES
  =================================================== */

  const recentActivities =
    useMemo(() => {
      const bookingActivities =
        bookings.map(
          (booking) => ({
            id:
              `booking-${booking._id}`,

            type:
              "booking",

            icon:
              "event",

            createdAt:
              booking.updatedAt ||
              booking.createdAt,

            text:
              normalizeStatus(
                booking.status
              ) ===
              "approved"
                ? `"${booking.eventName || "Event"}" was approved.`
                : normalizeStatus(
                      booking.status
                    ) ===
                    "rejected"
                  ? `"${booking.eventName || "Event"}" was rejected.`
                  : normalizeStatus(
                        booking.status
                      ) ===
                      "cancelled"
                    ? `"${booking.eventName || "Event"}" was cancelled.`
                    : `${getOrganizationName(
                        booking
                      )} submitted "${booking.eventName || "an event"}".`,
          })
        );

      const postActivities =
        announcements.map(
          (post) => ({
            id:
              `post-${post._id}`,

            type:
              "post",

            icon:
              "campaign",

            createdAt:
              post.updatedAt ||
              post.createdAt,

            text:
              normalizeStatus(
                post.status
              ) ===
              "approved"
                ? `"${post.title || "Post"}" was published.`
                : normalizeStatus(
                      post.status
                    ) ===
                    "rejected"
                  ? `"${post.title || "Post"}" was rejected.`
                  : `${getOrganizationName(
                      post
                    )} submitted "${post.title || "a post"}" for review.`,
          })
        );

      return [
        ...bookingActivities,
        ...postActivities,
      ]
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              b.createdAt ||
                0
            ) -
            new Date(
              a.createdAt ||
                0
            )
        )
        .slice(
          0,
          6
        );
    }, [
      bookings,
      announcements,
    ]);

  /* ===================================================
     REVIEW BUTTON
  =================================================== */

  const reviewBooking =
    (
      booking
    ) => {
      navigate(
        "/admin/events",
        {
          state: {
            bookingId:
              booking._id,
          },
        }
      );
    };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
  <div
    className="
      mx-auto
      w-full
      max-w-[1120px]

      space-y-5
    "
  >
      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="
            flex
            items-center
            justify-between
            gap-4

            rounded-2xl

            border
            border-red-200

            bg-red-50

            px-5
            py-4

            text-sm
            font-semibold
            text-red-700
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <MaterialIcon
              name="error"
              className="
                text-[20px]
              "
            />

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={
              loadDashboard
            }
            className="
              rounded-lg

              bg-red-100

              px-3
              py-2

              text-xs
              font-black

              hover:bg-red-200
            "
          >
            Retry
          </button>
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <motion.div
  initial={{
    opacity: 0,
    y: 20,
  }}
  animate={{
    opacity: 1,
    y: 0,
  }}
  className="
    rounded-[22px]

    bg-gradient-to-r
    from-[#020617]
    via-[#00254d]
    to-[#064477]

    px-6
    py-6

    text-white
  "
>
  <p
    className="
      text-[9px]
      font-black
      uppercase
      tracking-[0.16em]

      text-yellow-400
    "
  >
    Administrator Portal
  </p>

  <h1
    className="
      mt-2

      text-[26px]
      font-black
    "
  >
    Admin Dashboard
  </h1>

  <p
    className="
      mt-2

      max-w-2xl

      text-[11px]
      leading-5
      text-blue-100
    "
  >
    Monitor and manage the NUnified Event Management System.
  </p>
</motion.div>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div
        className="
          grid

          grid-cols-2

          gap-4

          lg:grid-cols-4
        "
      >
        {statistics.map(
          (
            item,
            index
          ) => (
            <motion.div
              key={
                item.title
              }
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay:
                  index *
                  0.08,
              }}
              className="
                rounded-2xl

                border
                border-gray-100

                bg-white

                p-5

                shadow-sm

                transition-all
                duration-200

                hover:-translate-y-1
                hover:shadow-lg
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11

                  items-center
                  justify-center

                  rounded-xl

                  bg-blue-950

                  text-yellow-400
                "
              >
                <MaterialIcon
                  name={
                    item.icon
                  }
                  className="
                    text-[23px]
                  "
                />
              </div>

              <p
                className="
                  mt-4

                  text-[10px]
                  font-black
                  uppercase
                  tracking-wide

                  text-gray-500
                "
              >
                {
                  item.title
                }
              </p>

              <h2
                className="
                  mt-1

                  text-3xl
                  font-black

                  text-blue-950
                "
              >
                {loading
                  ? "..."
                  : item.value}
              </h2>
            </motion.div>
          )
        )}
      </div>

      {/* =================================================
          EVENT CALENDAR
      ================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.2,
        }}
      >
        <AdminEventCalendar />
      </motion.div>

      {/* =================================================
          PENDING APPROVALS
      ================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.25,
        }}
        className="
          rounded-3xl

          bg-white

          p-5

          shadow-sm

          sm:p-6
        "
      >
        {/* HEADER */}

        <div
          className="
            flex
            flex-col

            gap-2

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h2
              className="
                text-xl
                font-black

                text-blue-950
              "
            >
              Pending Approvals
            </h2>

            <p
              className="
                mt-1

                text-[10px]
                text-gray-500
              "
            >
              Event requests that
              require Administrator
              review.
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-2

              text-[10px]
              font-black
              text-yellow-600
            "
          >
            <span
              className="
                h-2
                w-2

                rounded-full

                bg-yellow-400
              "
            />

            Requires Action
          </div>
        </div>

        {/* ===============================================
            LOADING
        =============================================== */}

        {loading ? (
          <div
            className="
              flex
              min-h-[180px]

              items-center
              justify-center

              text-gray-400
            "
          >
            <MaterialIcon
              name="progress_activity"
              className="
                animate-spin

                text-[28px]
              "
            />
          </div>
        ) : visiblePending.length >
          0 ? (
          /* =============================================
             ITEMS
          ============================================= */

          <div
            className="
              mt-5

              space-y-3
            "
          >
            {visiblePending.map(
              (
                booking,
                index
              ) => (
                <motion.div
                  key={
                    booking._id
                  }
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index *
                      0.05,
                  }}
                  className="
                    group

                    flex
                    flex-col

                    gap-4

                    rounded-2xl

                    border
                    border-gray-200

                    bg-gray-50

                    p-4

                    transition-all
                    duration-200

                    hover:border-yellow-300
                    hover:bg-yellow-50/40
                    hover:shadow-md

                    md:flex-row
                    md:items-center
                    md:justify-between
                  "
                >
                  {/* =====================================
                      LEFT
                  ====================================== */}

                  <div
                    className="
                      flex
                      min-w-0
                      flex-1

                      items-start
                      gap-3
                    "
                  >
                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0

                        items-center
                        justify-center

                        rounded-xl

                        bg-yellow-100

                        text-yellow-600

                        transition

                        group-hover:bg-yellow-200
                      "
                    >
                      <MaterialIcon
                        name="pending_actions"
                        className="
                          text-[22px]
                        "
                      />
                    </div>

                    <div
                      className="
                        min-w-0
                      "
                    >
                      <h3
                        className="
                          truncate

                          text-sm
                          font-black

                          text-blue-950
                        "
                      >
                        {booking.eventName ||
                          "Event Request"}
                      </h3>

                      <p
                        className="
                          mt-0.5

                          text-[10px]
                          font-bold
                          text-blue-700
                        "
                      >
                        {getOrganizationName(
                          booking
                        )}

                        {getOrganizationAcronym(
                          booking
                        ) && (
                          <>
                            {" "}
                            (
                            {getOrganizationAcronym(
                              booking
                            )}
                            )
                          </>
                        )}
                      </p>

                      {/* META */}

                      <div
                        className="
                          mt-2

                          flex
                          flex-wrap
                          items-center

                          gap-x-4
                          gap-y-2

                          text-[9px]
                          text-gray-500
                        "
                      >
                        <span
                          className="
                            flex
                            items-center
                            gap-1
                          "
                        >
                          <MaterialIcon
                            name="calendar_month"
                            className="
                              text-[15px]
                            "
                          />

                          {formatDate(
                            booking.eventDate
                          )}
                        </span>

                        <span
                          className="
                            flex
                            items-center
                            gap-1
                          "
                        >
                          <MaterialIcon
                            name="location_on"
                            className="
                              text-[15px]
                            "
                          />

                          {booking.venue ||
                            "Venue not set"}
                        </span>

                        <span
                          className="
                            flex
                            items-center
                            gap-1
                          "
                        >
                          <MaterialIcon
                            name="schedule"
                            className="
                              text-[15px]
                            "
                          />

                          {formatTime(
                            booking.startTime
                          )}

                          {booking.endTime
                            ? ` - ${formatTime(
                                booking.endTime
                              )}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* =====================================
                      REVIEW BUTTON
                  ====================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      reviewBooking(
                        booking
                      )
                    }
                    className="
                      group/review

                      flex
                      w-full
                      min-w-[145px]

                      items-center
                      justify-center
                      gap-2

                      rounded-xl

                      border
                      border-yellow-300

                      bg-gradient-to-r
                      from-yellow-300
                      via-yellow-400
                      to-amber-400

                      px-5
                      py-3

                      text-[12px]
                      font-black
                      text-blue-950

                      shadow-md
                      shadow-yellow-400/20

                      transition-all
                      duration-200

                      hover:-translate-y-0.5
                      hover:scale-[1.03]
                      hover:from-yellow-400
                      hover:via-yellow-400
                      hover:to-yellow-500

                      hover:shadow-lg
                      hover:shadow-yellow-400/30

                      active:translate-y-0
                      active:scale-[0.97]

                      focus:outline-none
                      focus-visible:ring-4
                      focus-visible:ring-yellow-200

                      md:w-auto
                    "
                  >
                    <MaterialIcon
                      name="rate_review"
                      className="
                        text-[20px]

                        transition-transform
                        duration-200

                        group-hover/review:scale-110
                      "
                    />

                    <span>
                      Review
                    </span>

                    <MaterialIcon
                      name="arrow_forward"
                      className="
                        text-[18px]

                        transition-transform
                        duration-200

                        group-hover/review:translate-x-1
                      "
                    />
                  </button>
                </motion.div>
              )
            )}

            {/* =============================================
                VIEW ALL
            ============================================= */}

            {pendingBookings.length >
              visiblePending.length && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/admin/events"
                  )
                }
                className="
                  mt-2

                  flex
                  w-full

                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  border
                  border-blue-100

                  bg-blue-50

                  px-4
                  py-3

                  text-xs
                  font-black
                  text-blue-950

                  transition

                  hover:bg-blue-100
                "
              >
                View All Pending
                Approvals

                <MaterialIcon
                  name="arrow_forward"
                  className="
                    text-[17px]
                  "
                />
              </button>
            )}
          </div>
        ) : (
          /* =============================================
             EMPTY
          ============================================= */

          <div
            className="
              mt-5

              flex
              min-h-[150px]

              flex-col
              items-center
              justify-center

              rounded-2xl

              border
              border-dashed
              border-gray-200

              bg-gray-50

              text-center
            "
          >
            <div
              className="
                flex
                h-11
                w-11

                items-center
                justify-center

                rounded-xl

                bg-green-100

                text-green-600
              "
            >
              <MaterialIcon
                name="task_alt"
                className="
                  text-[24px]
                "
              />
            </div>

            <h3
              className="
                mt-3

                text-sm
                font-black

                text-blue-950
              "
            >
              No Pending Approvals
            </h3>

            <p
              className="
                mt-1

                text-[10px]
                text-gray-500
              "
            >
              All event booking
              requests have been
              reviewed.
            </p>
          </div>
        )}
      </motion.div>

      {/* =================================================
          RECENT ACTIVITIES
      ================================================= */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.3,
        }}
        className="
          rounded-3xl

          bg-white

          p-5

          shadow-sm

          sm:p-6
        "
      >
        <h2
          className="
            text-xl
            font-black

            text-blue-950
          "
        >
          Recent Activities
        </h2>

        <p
          className="
            mt-1

            text-[10px]
            text-gray-500
          "
        >
          Latest activity across
          NUnified.
        </p>

        {loading ? (
          <div
            className="
              flex
              min-h-[150px]

              items-center
              justify-center

              text-gray-400
            "
          >
            <MaterialIcon
              name="progress_activity"
              className="
                animate-spin

                text-[28px]
              "
            />
          </div>
        ) : recentActivities.length >
          0 ? (
          <div
            className="
              mt-4

              divide-y
              divide-gray-100
            "
          >
            {recentActivities.map(
              (
                activity
              ) => (
                <div
                  key={
                    activity.id
                  }
                  className="
                    flex
                    items-start
                    gap-3

                    py-3
                  "
                >
                  <div
                    className={`
                      flex
                      h-9
                      w-9
                      shrink-0

                      items-center
                      justify-center

                      rounded-lg

                      ${
                        activity.type ===
                        "post"
                          ? `
                            bg-blue-50
                            text-blue-600
                          `
                          : `
                            bg-indigo-50
                            text-indigo-600
                          `
                      }
                    `}
                  >
                    <MaterialIcon
                      name={
                        activity.icon
                      }
                      className="
                        text-[19px]
                      "
                    />
                  </div>

                  <div>
                    <p
                      className="
                        text-[11px]
                        font-medium

                        text-blue-950
                      "
                    >
                      {
                        activity.text
                      }
                    </p>

                    <p
                      className="
                        mt-1

                        text-[9px]
                        text-gray-400
                      "
                    >
                      {formatDate(
                        activity.createdAt
                      )}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div
            className="
              py-10

              text-center

              text-sm
              text-gray-400
            "
          >
            No recent activities.
          </div>
        )}
      </motion.div>
    </div>
  );
}