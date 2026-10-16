import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import api from "../../api/axiosClient.js";

import EventCalendarWidget from "../../components/common/EventCalendarWidget.jsx";

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
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

/* =====================================================
   STATUS
===================================================== */

function statusOf(
  value,
) {
  return String(
    value || "",
  )
    .trim()
    .toLowerCase();
}

/* =====================================================
   NORMALIZE SHARED CALENDAR EVENT
===================================================== */

function normalizeCalendarEvent(
  item,
) {
  if (!item) {
    return null;
  }

  /* ===================================================
     ORGANIZATION
  =================================================== */

  const organization =
    item.organization ||
    item.organizationData ||
    item.extendedProps
      ?.organization || {
      organizationName:
        item.organizationName ||
        "Organization",

      acronym:
        item.organizationAcronym ||
        "",

      color:
        item.organizationColor ||
        item.color ||
        "#FACC15",
    };

  /* ===================================================
     DATE
  =================================================== */

  const eventDate =
    item.eventDate ||
    item.date ||
    item.start ||
    item.schedule?.date ||
    item.currentSchedule
      ?.date ||
    item.approvedSchedule
      ?.date ||
    item.extendedProps
      ?.eventDate ||
    "";

  /* ===================================================
     START TIME
  =================================================== */

  const startTime =
    item.startTime ||
    item.schedule
      ?.startTime ||
    item.currentSchedule
      ?.startTime ||
    item.approvedSchedule
      ?.startTime ||
    item.extendedProps
      ?.startTime ||
    "";

  /* ===================================================
     END TIME
  =================================================== */

  const endTime =
    item.endTime ||
    item.schedule
      ?.endTime ||
    item.currentSchedule
      ?.endTime ||
    item.approvedSchedule
      ?.endTime ||
    item.extendedProps
      ?.endTime ||
    "";

  /* ===================================================
     FORMATTED TIME
  =================================================== */

  const time =
    item.time ||
    item.timeRange ||
    item.extendedProps
      ?.time ||
    "";

  /* ===================================================
     VENUE
  =================================================== */

  const venue =
    item.venue ||
    item.location ||
    item.schedule?.venue ||
    item.currentSchedule
      ?.venue ||
    item.approvedSchedule
      ?.venue ||
    item.extendedProps
      ?.venue ||
    "Venue not specified";

  /* ===================================================
     STATUS
  =================================================== */

  const status =
    item.status ||
    item.extendedProps
      ?.status ||
    "approved";

  /* ===================================================
     COLOR
  =================================================== */

  let organizationColor =
    "#FACC15";

  if (
    organization &&
    typeof organization ===
      "object"
  ) {
    organizationColor =
      organization.color ||
      item.organizationColor ||
      item.color ||
      "#FACC15";
  } else {
    organizationColor =
      item.organizationColor ||
      item.color ||
      "#FACC15";
  }

  /* ===================================================
     SAFE CALENDAR OBJECT
  =================================================== */

  return {
    _id:
      item._id ||
      item.id ||
      `${eventDate}-${String(
        organization,
      )}`,

    eventDate,

    start:
      eventDate,

    organization,

    startTime,

    endTime,

    time,

    venue,

    status,

    color:
      organizationColor,

    organizationColor,

    extendedProps: {
      organization,

      eventDate,

      startTime,

      endTime,

      time,

      venue,

      status,

      organizationColor,
    },
  };
}

/* =====================================================
   PAGE
===================================================== */

export default function OrganizationDashboard() {
  /* ===================================================
     ORGANIZATION
  =================================================== */

  const [
    organization,
    setOrganization,
  ] =
    useState(null);

  /* ===================================================
     MY BOOKINGS
  =================================================== */

  const [
    myBookings,
    setMyBookings,
  ] =
    useState([]);

  /* ===================================================
     GENERAL CALENDAR
  =================================================== */

  const [
    sharedCalendar,
    setSharedCalendar,
  ] =
    useState([]);

  /* ===================================================
     LOADING
  =================================================== */

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /* ===================================================
     ERROR
  =================================================== */

  const [
    error,
    setError,
  ] =
    useState("");

  /* ===================================================
     LOAD DASHBOARD
  =================================================== */

  useEffect(() => {
    const load =
      async () => {
        setLoading(
          true,
        );

        setError("");

        try {
          const [
            profileResult,
            myResult,
            calendarResult,
          ] =
            await Promise.all(
              [
                api.get(
                  "/organizations/me",
                ),

                api.get(
                  "/bookings/my",
                ),

                api.get(
                  "/bookings/calendar",
                ),
              ],
            );

          /* =============================================
             ORGANIZATION
          ============================================= */

          setOrganization(
            profileResult.data
              ?.organization ||
              profileResult.data ||
              null,
          );

          /* =============================================
             MY BOOKINGS
          ============================================= */

          const myBookingData =
            Array.isArray(
              myResult.data,
            )
              ? myResult.data
              : Array.isArray(
                    myResult.data
                      ?.bookings,
                  )
                ? myResult.data
                    .bookings
                : [];

          setMyBookings(
            myBookingData,
          );

          /* =============================================
             SHARED CALENDAR
          ============================================= */

          const rawCalendar =
            Array.isArray(
              calendarResult.data,
            )
              ? calendarResult.data
              : Array.isArray(
                    calendarResult
                      .data
                      ?.bookings,
                  )
                ? calendarResult
                    .data
                    .bookings
                : Array.isArray(
                      calendarResult
                        .data
                        ?.events,
                    )
                  ? calendarResult
                      .data
                      .events
                  : [];

          /* =============================================
             NORMALIZE CALENDAR
          ============================================= */

          const normalizedCalendar =
            rawCalendar
              .map(
                normalizeCalendarEvent,
              )
              .filter(
                Boolean,
              );

          setSharedCalendar(
            normalizedCalendar,
          );

          console.log(
            "GENERAL CALENDAR DATA:",
            normalizedCalendar.map(
              (
                event,
              ) => ({
                organization:
                  event.organization,

                eventDate:
                  event.eventDate,

                startTime:
                  event.startTime,

                endTime:
                  event.endTime,

                time:
                  event.time,

                venue:
                  event.venue,

                status:
                  event.status,
              }),
            ),
          );
        } catch (
          error
        ) {
          console.error(
            "ORGANIZATION DASHBOARD ERROR:",
            error,
          );

          setError(
            error.response
              ?.data
              ?.message ||
              "Unable to load some dashboard information.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    load();
  }, []);

  /* ===================================================
     ORGANIZATION NAME
  =================================================== */

  const name =
    organization
      ?.organizationName ||
    organization
      ?.acronym ||
    "Organization";

  /* ===================================================
     TOTAL
  =================================================== */

  const total =
    myBookings.length;

  /* ===================================================
     APPROVED
  =================================================== */

  const approved =
    useMemo(
      () =>
        myBookings.filter(
          (
            item,
          ) =>
            statusOf(
              item.status,
            ) ===
            "approved",
        ).length,
      [
        myBookings,
      ],
    );

  /* ===================================================
     PENDING
  =================================================== */

  const pending =
    useMemo(
      () =>
        myBookings.filter(
          (
            item,
          ) =>
            statusOf(
              item.status,
            ) ===
            "pending",
        ).length,
      [
        myBookings,
      ],
    );

  /* ===================================================
     REJECTED
  =================================================== */

  const rejected =
    useMemo(
      () =>
        myBookings.filter(
          (
            item,
          ) =>
            statusOf(
              item.status,
            ) ===
            "rejected",
        ).length,
      [
        myBookings,
      ],
    );

  /* =====================================================
     UI
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
          WELCOME HEADER
      ================================================= */}

      <motion.section
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
          Organization Portal
        </p>

        <h1
          className="
            mt-2

            text-[26px]
            font-black
          "
        >
          Welcome, {name}
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
          Manage your
          organization's
          events,
          reservations and
          student updates.
        </p>
      </motion.section>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="
            flex
            items-center
            gap-2

            rounded-xl

            border
            border-red-200

            bg-red-50

            px-4
            py-3

            text-[10px]
            font-bold
            text-red-700
          "
        >
          <MaterialIcon
            name="error"
            className="
              text-[18px]
            "
          />

          {error}
        </div>
      )}

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div
        className="
          grid
          grid-cols-2
          gap-3

          lg:grid-cols-4
        "
      >
        <Stat
          title="Total Bookings"
          value={
            total
          }
          icon="event_note"
        />

        <Stat
          title="Pending"
          value={
            pending
          }
          icon="schedule"
        />

        <Stat
          title="Approved"
          value={
            approved
          }
          icon="check_circle"
        />

        <Stat
          title="Rejected"
          value={
            rejected
          }
          icon="cancel"
        />
      </div>

      {/* =================================================
          ACTIONS + GENERAL CALENDAR
      ================================================= */}

      <div
        className="
          grid
          items-start
          gap-5

          lg:grid-cols-[280px_minmax(0,1fr)]
        "
      >
        {/* ===============================================
            LEFT ACTIONS
        =============================================== */}

        <div
          className="
            space-y-4
          "
        >
          <Action
            icon="event_available"
            title="Event Venue Booking"
            text="Submit a request for event venue reservation."
            path="/organization/booking"
            action="Book Venue"
          />

          <Action
            icon="campaign"
            title="Create Post"
            text="Share announcements, news and updates."
            path="/organization/create-post"
            action="Create Post"
          />

          <Action
            icon="support_agent"
            title="Admin Request"
            text="Send concerns and requests to the administrator."
            path="/organization/admin-request"
            action="Send Request"
          />
        </div>

        {/* ===============================================
            GENERAL CALENDAR
        =============================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.15,
          }}
          className="
            min-w-0
          "
        >
          {loading ? (
            <div
              className="
                flex
                min-h-[430px]

                items-center
                justify-center

                rounded-[22px]

                border
                border-gray-100

                bg-white

                p-8

                text-center
                text-gray-500

                shadow-sm
              "
            >
              <div>
                <div
                  className="
                    mx-auto

                    flex
                    h-12
                    w-12

                    items-center
                    justify-center

                    rounded-xl

                    bg-blue-950

                    text-yellow-400
                  "
                >
                  <MaterialIcon
                    name="calendar_month"
                    className="
                      text-[24px]
                    "
                  />
                </div>

                <p
                  className="
                    mt-3

                    text-[10px]
                    font-bold
                  "
                >
                  Loading
                  calendar...
                </p>
              </div>
            </div>
          ) : (
            <EventCalendarWidget
              events={
                sharedCalendar
              }
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function Stat({
  title,
  value,
  icon,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="
        rounded-2xl

        border
        border-gray-200

        bg-white

        p-4

        shadow-sm
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div>
          <p
            className="
              text-[7px]
              font-black
              uppercase
              tracking-wide

              text-gray-500
            "
          >
            {title}
          </p>

          <p
            className="
              mt-2

              text-[20px]
              font-black
              text-blue-950
            "
          >
            {value}
          </p>
        </div>

        <div
          className="
            flex
            h-9
            w-9
            shrink-0

            items-center
            justify-center

            rounded-xl

            bg-blue-950

            text-yellow-400
          "
        >
          <MaterialIcon
            name={
              icon
            }
            className="
              text-[19px]
            "
          />
        </div>
      </div>
    </motion.div>
  );
}

/* =====================================================
   ACTION CARD
===================================================== */

function Action({
  icon,
  title,
  text,
  path,
  action,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -2,
      }}
      className="
        rounded-[20px]

        border
        border-gray-100

        bg-white

        p-5

        shadow-sm

        transition-shadow

        hover:shadow-md
      "
    >
      {/* ICON */}

      <div
        className="
          flex
          h-10
          w-10

          items-center
          justify-center

          rounded-xl

          bg-blue-950

          text-yellow-400
        "
      >
        <MaterialIcon
          name={
            icon
          }
          className="
            text-[20px]
          "
        />
      </div>

      {/* TITLE */}

      <h2
        className="
          mt-4

          text-[17px]
          font-black
          text-blue-950
        "
      >
        {title}
      </h2>

      {/* DESCRIPTION */}

      <p
        className="
          mt-2

          text-[10px]
          leading-5
          text-gray-600
        "
      >
        {text}
      </p>

      {/* LINK */}

      <Link
        to={
          path
        }
        className="
          mt-4

          inline-flex
          items-center
          gap-1

          text-[10px]
          font-black
          text-blue-950

          transition-colors

          hover:text-yellow-600
        "
      >
        {action}

        <MaterialIcon
          name="arrow_forward"
          className="
            text-[16px]
          "
        />
      </Link>
    </motion.div>
  );
}