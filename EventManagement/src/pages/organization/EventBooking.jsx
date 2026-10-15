import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   CONFIGURATION
===================================================== */

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const EVENT_TYPES = [
  "Academic",
  "Organization",
  "Sports",
];

const VENUES = [
  "AVR",
  "Multipurpose Hall",
  "Gymnasium",
];

/* =====================================================
   EMPTY FORM
===================================================== */

const EMPTY_FORM = {
  eventName: "",
  eventType: "",
  otherEventType: "",
  description: "",
  venue: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  participants: "",
  request: "",
};

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
   EVENT BOOKING
===================================================== */

export default function EventBooking() {
  const navigate =
    useNavigate();

  const [
    formData,
    setFormData,
  ] = useState({
    ...EMPTY_FORM,
  });

  const [
    projectProposal,
    setProjectProposal,
  ] = useState(null);

  const [
    approvedArf,
    setApprovedArf,
  ] = useState(null);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState(null);

  /* ===================================================
     SCHEDULE AVAILABILITY
  =================================================== */

  const [
    scheduleStatus,
    setScheduleStatus,
  ] = useState({
    state: "idle",
    message: "",
  });

  /* ===================================================
     TODAY
  =================================================== */

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  /* ===================================================
     FORM CHANGE
  =================================================== */

  const handleChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFormData(
        (previous) => {
          if (
            name ===
            "eventType"
          ) {
            return {
              ...previous,

              eventType:
                value,

              otherEventType:
                value ===
                "Other"
                  ? previous
                      ?.otherEventType ||
                    ""
                  : "",
            };
          }

          /*
            When venue/date/time changes,
            availability will automatically
            be checked again.
          */

          return {
            ...previous,

            [name]:
              value,
          };
        }
      );

      setMessage(
        null
      );
    };

  /* ===================================================
     CHECK SCHEDULE

     Backend only considers APPROVED bookings.

     If another organization already has:
     - same venue
     - same date
     - overlapping time

     this becomes unavailable.
  =================================================== */

  useEffect(() => {
    const {
      venue,
      eventDate,
      startTime,
      endTime,
    } = formData;

    /*
      Do not call API until schedule
      information is complete.
    */

    if (
      !venue ||
      !eventDate ||
      !startTime ||
      !endTime
    ) {
      setScheduleStatus({
        state:
          "idle",

        message:
          "",
      });

      return;
    }

    /*
      Basic client-side time validation.
    */

    if (
      startTime >=
      endTime
    ) {
      setScheduleStatus({
        state:
          "blocked",

        message:
          "End Time must be later than Start Time.",
      });

      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        async () => {
          setScheduleStatus({
            state:
              "checking",

            message:
              "Checking venue availability...",
          });

          try {
            const response =
              await api.post(
                "/bookings/check-availability",
                {
                  venue,
                  eventDate,
                  startTime,
                  endTime,
                }
              );

            if (
              cancelled
            ) {
              return;
            }

            if (
              response.data
                ?.available
            ) {
              setScheduleStatus({
                state:
                  "available",

                message:
                  response.data
                    ?.message ||
                  "This venue and schedule are available.",
              });

              return;
            }

            setScheduleStatus({
              state:
                "blocked",

              message:
                response.data
                  ?.message ||
                "This venue is already occupied during the selected schedule.",
            });
          } catch (
            error
          ) {
            if (
              cancelled
            ) {
              return;
            }

            console.error(
              "CHECK AVAILABILITY ERROR:",
              error
            );

            /*
              400 / 409 can still contain
              the useful backend message.
            */

            const backendMessage =
              error.response
                ?.data
                ?.message;

            const backendAvailable =
              error.response
                ?.data
                ?.available;

            if (
              backendAvailable ===
              false
            ) {
              setScheduleStatus({
                state:
                  "blocked",

                message:
                  backendMessage ||
                  "This schedule is unavailable.",
              });

              return;
            }

            setScheduleStatus({
              state:
                "error",

              message:
                backendMessage ||
                "Unable to check schedule availability.",
            });
          }
        },

        350
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    formData.venue,
    formData.eventDate,
    formData.startTime,
    formData.endTime,
  ]);

  /* ===================================================
     PDF VALIDATION
  =================================================== */

  const validatePdf =
    (file) => {
      if (!file) {
        return {
          valid:
            false,

          message:
            "Please select a PDF file.",
        };
      }

      const isPdf =
        file.type ===
          "application/pdf" ||
        file.name
          .toLowerCase()
          .endsWith(
            ".pdf"
          );

      if (!isPdf) {
        return {
          valid:
            false,

          message:
            "Only PDF files are allowed.",
        };
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        return {
          valid:
            false,

          message:
            "PDF file must be 5 MB or smaller.",
        };
      }

      return {
        valid:
          true,

        message:
          "",
      };
    };

  /* ===================================================
     PROJECT PROPOSAL
  =================================================== */

  const handleProposalChange =
    (event) => {
      const file =
        event.target
          .files?.[0];

      if (!file) {
        return;
      }

      const validation =
        validatePdf(
          file
        );

      if (
        !validation.valid
      ) {
        setMessage({
          type:
            "error",

          text:
            validation.message,
        });

        event.target.value =
          "";

        return;
      }

      setProjectProposal(
        file
      );

      setMessage(
        null
      );
    };

  /* ===================================================
     ARF
  =================================================== */

  const handleArfChange =
    (event) => {
      const file =
        event.target
          .files?.[0];

      if (!file) {
        return;
      }

      const validation =
        validatePdf(
          file
        );

      if (
        !validation.valid
      ) {
        setMessage({
          type:
            "error",

          text:
            validation.message,
        });

        event.target.value =
          "";

        return;
      }

      setApprovedArf(
        file
      );

      setMessage(
        null
      );
    };

  /* ===================================================
     REMOVE FILES
  =================================================== */

  const removeProposal =
    () => {
      setProjectProposal(
        null
      );
    };

  const removeArf =
    () => {
      setApprovedArf(
        null
      );
    };

  /* ===================================================
     RESET
  =================================================== */

  const resetForm =
    () => {
      setFormData({
        ...EMPTY_FORM,
      });

      setProjectProposal(
        null
      );

      setApprovedArf(
        null
      );

      setScheduleStatus({
        state:
          "idle",

        message:
          "",
      });
    };

  /* ===================================================
     FINAL AVAILABILITY CHECK

     This runs again immediately before
     submitting the booking.

     This protects against this situation:

     Organization A checks schedule.
     ↓
     Schedule is available.
     ↓
     Organization B gets approved.
     ↓
     Organization A presses Submit.

     We check again before submission.
  =================================================== */

  const finalAvailabilityCheck =
    async () => {
      try {
        const response =
          await api.post(
            "/bookings/check-availability",
            {
              venue:
                formData.venue,

              eventDate:
                formData.eventDate,

              startTime:
                formData.startTime,

              endTime:
                formData.endTime,
            }
          );

        if (
          !response.data
            ?.available
        ) {
          setScheduleStatus({
            state:
              "blocked",

            message:
              response.data
                ?.message ||
              "This schedule is no longer available.",
          });

          return false;
        }

        return true;
      } catch (
        error
      ) {
        console.error(
          "FINAL AVAILABILITY CHECK ERROR:",
          error
        );

        setScheduleStatus({
          state:
            "blocked",

          message:
            error.response
              ?.data
              ?.message ||
            "Unable to reserve this schedule. Please choose another date or time.",
        });

        return false;
      }
    };

  /* ===================================================
     SUBMIT
  =================================================== */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setMessage(
        null
      );

      /* ===============================================
         EVENT NAME
      =============================================== */

      const eventName =
        String(
          formData
            ?.eventName ||
            ""
        ).trim();

      if (!eventName) {
        setMessage({
          type:
            "error",

          text:
            "Please enter the Event Name.",
        });

        return;
      }

      /* ===============================================
         EVENT TYPE
      =============================================== */

      const selectedType =
        String(
          formData
            ?.eventType ||
            ""
        ).trim();

      if (!selectedType) {
        setMessage({
          type:
            "error",

          text:
            "Please select an Event Type.",
        });

        return;
      }

      const otherType =
        String(
          formData
            ?.otherEventType ||
            ""
        ).trim();

      if (
        selectedType ===
          "Other" &&
        !otherType
      ) {
        setMessage({
          type:
            "error",

          text:
            "Please specify the Other Event Type.",
        });

        return;
      }

      /* ===============================================
         VENUE
      =============================================== */

      if (
        !String(
          formData
            ?.venue ||
            ""
        ).trim()
      ) {
        setMessage({
          type:
            "error",

          text:
            "Please select a Preferred Venue.",
        });

        return;
      }

      /* ===============================================
         DATE
      =============================================== */

      if (
        !formData
          ?.eventDate
      ) {
        setMessage({
          type:
            "error",

          text:
            "Please select an Event Date.",
        });

        return;
      }

      /* ===============================================
         TIME
      =============================================== */

      if (
        !formData
          ?.startTime ||
        !formData
          ?.endTime
      ) {
        setMessage({
          type:
            "error",

          text:
            "Please select both Start Time and End Time.",
        });

        return;
      }

      if (
        formData.startTime >=
        formData.endTime
      ) {
        setMessage({
          type:
            "error",

          text:
            "End Time must be later than Start Time.",
        });

        return;
      }

      /* ===============================================
         BLOCK OCCUPIED SCHEDULE
      =============================================== */

      if (
        scheduleStatus
          .state ===
        "blocked"
      ) {
        setMessage({
          type:
            "error",

          text:
            scheduleStatus
              .message ||
            "The selected venue, date, and time are already occupied.",
        });

        return;
      }

      /*
        Check server again before
        uploading the documents.
      */

      const stillAvailable =
        await finalAvailabilityCheck();

      if (
        !stillAvailable
      ) {
        setMessage({
          type:
            "error",

          text:
            "This venue/date/time is already occupied by an approved event. Please select another schedule.",
        });

        return;
      }

      /* ===============================================
         DOCUMENTS
      =============================================== */

      if (
        !projectProposal
      ) {
        setMessage({
          type:
            "error",

          text:
            "Approved Project Proposal PDF is required.",
        });

        return;
      }

      if (!approvedArf) {
        setMessage({
          type:
            "error",

          text:
            "Approved ARF PDF is required.",
        });

        return;
      }

      /* ===============================================
         FINAL EVENT TYPE
      =============================================== */

      const finalEventType =
        selectedType ===
        "Other"
          ? otherType
          : selectedType;

      /* ===============================================
         FORM DATA
      =============================================== */

      const payload =
        new FormData();

      payload.append(
        "eventName",
        eventName
      );

      payload.append(
        "eventType",
        finalEventType
      );

      payload.append(
        "description",
        String(
          formData
            ?.description ||
            ""
        ).trim()
      );

      payload.append(
        "venue",
        formData.venue
      );

      payload.append(
        "eventDate",
        formData.eventDate
      );

      payload.append(
        "startTime",
        formData.startTime
      );

      payload.append(
        "endTime",
        formData.endTime
      );

      payload.append(
        "participants",
        String(
          formData
            ?.participants ||
            ""
        ).trim()
      );

      payload.append(
        "request",
        String(
          formData
            ?.request ||
            ""
        ).trim()
      );

      payload.append(
        "projectProposal",
        projectProposal
      );

      payload.append(
        "approvedArf",
        approvedArf
      );

      /* ===============================================
         SUBMIT
      =============================================== */

      setSubmitting(
        true
      );

      try {
        await api.post(
          "/bookings",
          payload
        );

        resetForm();

        setMessage({
          type:
            "success",

          text:
            "Booking request submitted successfully.",
        });

        window.scrollTo({
          top:
            0,

          behavior:
            "smooth",
        });
      } catch (
        error
      ) {
        console.error(
          "CREATE BOOKING ERROR:",
          error
        );

        /*
          Backend also performs conflict
          validation.

          If another event became approved
          while the request was being sent,
          it still cannot be double-booked.
        */

        if (
          error.response
            ?.status ===
          409
        ) {
          setScheduleStatus({
            state:
              "blocked",

            message:
              error.response
                ?.data
                ?.message ||
              "This schedule is already occupied.",
          });
        }

        setMessage({
          type:
            "error",

          text:
            error.response
              ?.data
              ?.message ||
            "Unable to submit booking request.",
        });
      } finally {
        setSubmitting(
          false
        );
      }
    };

  /* ===================================================
     SCHEDULE FIELD STYLE
  =================================================== */

  const scheduleInputStyle =
    scheduleStatus
      .state ===
    "blocked"
      ? `
        border-red-300
        bg-red-50
        focus:border-red-500
        focus:ring-red-100
      `
      : scheduleStatus
            .state ===
          "available"
        ? `
          border-green-300
          bg-green-50/40
          focus:border-green-500
          focus:ring-green-100
        `
        : `
          border-gray-200
          bg-white
          focus:border-yellow-400
          focus:ring-yellow-100
        `;

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1200px]
        space-y-5
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <motion.div
        initial={{
          opacity:
            0,

          y:
            20,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
        className="
          rounded-[20px]

          bg-gradient-to-r
          from-[#020617]
          via-[#001F3F]
          to-[#064477]

          px-6
          py-5

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
            mt-1.5
            text-[26px]
            font-black
          "
        >
          Event Venue Booking
        </h1>

        <p
          className="
            mt-1.5
            max-w-[760px]
            text-[11px]
            leading-5
            text-blue-100
          "
        >
          Choose a venue and
          schedule, then submit
          the required approved
          PDF documents.
        </p>
      </motion.div>

      {/* =================================================
          MESSAGE
      ================================================= */}

      {message && (
        <MessageBox
          type={
            message.type
          }
          text={
            message.text
          }
          onClose={() =>
            setMessage(
              null
            )
          }
        />
      )}

      {/* =================================================
          FORM
      ================================================= */}

      <motion.form
        onSubmit={
          handleSubmit
        }
        initial={{
          opacity:
            0,

          y:
            10,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
        encType="multipart/form-data"
        className="
          rounded-[22px]
          bg-white
          p-6
          shadow-sm
        "
      >
        {/* =================================================
            EVENT INFORMATION
        ================================================= */}

        <section>
          <SectionHeading
            icon="event"
            title="Event Information"
            description="Enter the basic details of your event."
          />

          <div
            className="
              mt-6
              grid
              gap-4
              md:grid-cols-2
            "
          >
            <div>
              <FieldLabel
                htmlFor="eventName"
                required
              >
                Event Name
              </FieldLabel>

              <input
                id="eventName"
                type="text"
                name="eventName"
                value={
                  formData
                    .eventName
                }
                onChange={
                  handleChange
                }
                maxLength={
                  150
                }
                placeholder="Enter event name"
                className="
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  text-[10px]
                  text-blue-950
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              />
            </div>

            {/* =============================================
                EVENT TYPE
            ============================================= */}

            <div>
              <FieldLabel
                htmlFor="eventType"
                required
              >
                Event Type
              </FieldLabel>

              <select
                id="eventType"
                name="eventType"
                value={
                  formData
                    ?.eventType ||
                  ""
                }
                onChange={
                  handleChange
                }
                className="
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  text-[10px]
                  text-blue-950
                  outline-none
                  transition
                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              >
                <option value="">
                  Select Event Type
                </option>

                {EVENT_TYPES.map(
                  (type) => (
                    <option
                      key={
                        type
                      }
                      value={
                        type
                      }
                    >
                      {type}
                    </option>
                  )
                )}

                <option value="Other">
                  Other
                </option>
              </select>

              {formData
                ?.eventType ===
                "Other" && (
                <motion.div
                  initial={{
                    opacity:
                      0,

                    y:
                      -5,
                  }}
                  animate={{
                    opacity:
                      1,

                    y:
                      0,
                  }}
                  className="
                    mt-3
                  "
                >
                  <FieldLabel
                    htmlFor="otherEventType"
                    required
                  >
                    Specify Other
                    Event Type
                  </FieldLabel>

                  <input
                    id="otherEventType"
                    type="text"
                    name="otherEventType"
                    value={
                      formData
                        ?.otherEventType ||
                      ""
                    }
                    onChange={
                      handleChange
                    }
                    maxLength={
                      100
                    }
                    placeholder="Example: Seminar, Workshop, Competition"
                    className="
                      mt-2
                      h-11
                      w-full
                      rounded-xl
                      border
                      border-yellow-300
                      bg-yellow-50/50
                      px-4
                      text-[10px]
                      text-blue-950
                      outline-none
                      transition
                      placeholder:text-gray-400
                      focus:border-yellow-500
                      focus:bg-white
                      focus:ring-2
                      focus:ring-yellow-100
                    "
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* ===============================================
              DESCRIPTION
          =============================================== */}

          <div
            className="
              mt-4
            "
          >
            <FieldLabel
              htmlFor="description"
            >
              Event Description
            </FieldLabel>

            <textarea
              id="description"
              name="description"
              value={
                formData
                  .description
              }
              onChange={
                handleChange
              }
              rows={
                4
              }
              maxLength={
                2000
              }
              placeholder="Describe your event"
              className="
                mt-2
                w-full
                resize-none
                rounded-xl
                border
                border-gray-200
                bg-white
                px-4
                py-3
                text-[10px]
                leading-5
                text-blue-950
                outline-none
                transition
                placeholder:text-gray-400
                focus:border-yellow-400
                focus:ring-2
                focus:ring-yellow-100
              "
            />

            <p
              className="
                mt-1
                text-right
                text-[7px]
                text-gray-400
              "
            >
              {
                formData
                  .description
                  .length
              }
              /2000
            </p>
          </div>
        </section>

        {/* =================================================
            VENUE & SCHEDULE
        ================================================= */}

        <section
          className="
            mt-8
          "
        >
          <SectionHeading
            icon="calendar_month"
            title="Venue & Schedule"
            description="Approved bookings automatically block conflicting venue schedules."
          />

          <div
            className="
              mt-6
              grid
              gap-4
              md:grid-cols-2
            "
          >
            {/* =============================================
                VENUE
            ============================================= */}

            <div>
              <FieldLabel
                htmlFor="venue"
                required
              >
                Preferred Venue
              </FieldLabel>

              <select
                id="venue"
                name="venue"
                value={
                  formData
                    .venue
                }
                onChange={
                  handleChange
                }
                className="
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  text-[10px]
                  text-blue-950
                  outline-none
                  transition
                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              >
                <option value="">
                  Select venue
                </option>

                {VENUES.map(
                  (venue) => (
                    <option
                      key={
                        venue
                      }
                      value={
                        venue
                      }
                    >
                      {venue}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* =============================================
                DATE
            ============================================= */}

            <div>
              <FieldLabel
                htmlFor="eventDate"
                required
              >
                Event Date
              </FieldLabel>

              <input
                id="eventDate"
                type="date"
                name="eventDate"
                min={
                  today
                }
                value={
                  formData
                    .eventDate
                }
                onChange={
                  handleChange
                }
                className={`
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  px-4
                  text-[10px]
                  text-blue-950
                  outline-none
                  transition
                  focus:ring-2

                  ${scheduleInputStyle}
                `}
              />
            </div>

            {/* =============================================
                START TIME
            ============================================= */}

            <div>
              <FieldLabel
                htmlFor="startTime"
                required
              >
                Start Time
              </FieldLabel>

              <input
                id="startTime"
                type="time"
                name="startTime"
                value={
                  formData
                    .startTime
                }
                onChange={
                  handleChange
                }
                className={`
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  px-4
                  text-[10px]
                  text-blue-950
                  outline-none
                  transition
                  focus:ring-2

                  ${scheduleInputStyle}
                `}
              />
            </div>

            {/* =============================================
                END TIME
            ============================================= */}

            <div>
              <FieldLabel
                htmlFor="endTime"
                required
              >
                End Time
              </FieldLabel>

              <input
                id="endTime"
                type="time"
                name="endTime"
                value={
                  formData
                    .endTime
                }
                onChange={
                  handleChange
                }
                className={`
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  px-4
                  text-[10px]
                  text-blue-950
                  outline-none
                  transition
                  focus:ring-2

                  ${scheduleInputStyle}
                `}
              />
            </div>
          </div>

          {/* ===============================================
              AVAILABILITY STATUS
          =============================================== */}

          <ScheduleAvailability
            status={
              scheduleStatus
            }
            complete={
              Boolean(
                formData.venue &&
                  formData.eventDate &&
                  formData.startTime &&
                  formData.endTime
              )
            }
          />
        </section>

        {/* =================================================
            REQUIRED DOCUMENTS
        ================================================= */}

        <section
          className="
            mt-8
          "
        >
          <SectionHeading
            icon="picture_as_pdf"
            title="Required PDF Documents"
            description="Both approved documents must be submitted as PDF files."
          />

          <div
            className="
              mt-6
              grid
              gap-4
              md:grid-cols-2
            "
          >
            <PdfUploadCard
              id="projectProposal"
              title="Approved Project Proposal"
              description="Upload the approved Project Proposal."
              file={
                projectProposal
              }
              onChange={
                handleProposalChange
              }
              onRemove={
                removeProposal
              }
            />

            <PdfUploadCard
              id="approvedArf"
              title="Approved ARF"
              description="Upload the approved Activity Request Form."
              file={
                approvedArf
              }
              onChange={
                handleArfChange
              }
              onRemove={
                removeArf
              }
            />
          </div>
        </section>

        {/* =================================================
            ADDITIONAL INFORMATION
        ================================================= */}

        <section
          className="
            mt-8
          "
        >
          <SectionHeading
            icon="info"
            title="Additional Information"
            description="Add participant information or special venue requests."
          />

          <div
            className="
              mt-6
            "
          >
            <div
              className="
                max-w-[420px]
              "
            >
              <FieldLabel
                htmlFor="participants"
              >
                Expected Participants
              </FieldLabel>

              <input
                id="participants"
                type="number"
                name="participants"
                min={
                  0
                }
                value={
                  formData
                    .participants
                }
                onChange={
                  handleChange
                }
                placeholder="Number of participants"
                className="
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  text-[10px]
                  text-blue-950
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              />
            </div>

            <div
              className="
                mt-4
              "
            >
              <FieldLabel
                htmlFor="request"
              >
                Special Requests
              </FieldLabel>

              <textarea
                id="request"
                name="request"
                value={
                  formData
                    .request
                }
                onChange={
                  handleChange
                }
                rows={
                  3
                }
                maxLength={
                  1500
                }
                placeholder="Additional venue or equipment requests"
                className="
                  mt-2
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  px-4
                  py-3
                  text-[10px]
                  leading-5
                  text-blue-950
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-yellow-400
                  focus:ring-2
                  focus:ring-yellow-100
                "
              />
            </div>
          </div>
        </section>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div
          className="
            mt-8
            flex
            flex-col
            gap-3
            border-t
            border-gray-100
            pt-5
            sm:flex-row
            sm:justify-end
          "
        >
          <button
            type="button"
            disabled={
              submitting
            }
            onClick={() =>
              navigate(
                "/organization/status"
              )
            }
            className="
              flex
              min-h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-gray-200
              bg-white
              px-5
              text-[10px]
              font-black
              text-blue-950
              transition
              hover:bg-gray-50
              disabled:opacity-50
            "
          >
            <MaterialIcon
              name="assignment"
              className="
                text-[18px]
              "
            />

            Booking Status
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              scheduleStatus
                .state ===
                "checking" ||
              scheduleStatus
                .state ===
                "blocked"
            }
            className="
              flex
              min-h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-yellow-400
              px-6
              text-[10px]
              font-black
              text-blue-950
              transition
              hover:bg-yellow-500
              disabled:cursor-not-allowed
              disabled:bg-gray-200
              disabled:text-gray-500
              disabled:opacity-70
            "
          >
            {submitting ? (
              <>
                <MaterialIcon
                  name="progress_activity"
                  className="
                    animate-spin
                    text-[18px]
                  "
                />

                Submitting...
              </>
            ) : scheduleStatus
                .state ===
              "blocked" ? (
              <>
                <MaterialIcon
                  name="block"
                  className="
                    text-[18px]
                  "
                />

                Schedule Occupied
              </>
            ) : (
              <>
                <MaterialIcon
                  name="send"
                  className="
                    text-[18px]
                  "
                />

                Submit Booking Request
              </>
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

/* =====================================================
   SCHEDULE AVAILABILITY
===================================================== */

function ScheduleAvailability({
  status,
  complete,
}) {
  if (!complete) {
    return (
      <div
        className="
          mt-4
          flex
          items-start
          gap-3
          rounded-xl
          border
          border-blue-100
          bg-blue-50
          px-4
          py-3
        "
      >
        <MaterialIcon
          name="info"
          className="
            mt-[1px]
            text-[18px]
            text-blue-600
          "
        />

        <div>
          <p
            className="
              text-[9px]
              font-black
              text-blue-900
            "
          >
            Schedule Availability
          </p>

          <p
            className="
              mt-1
              text-[8px]
              leading-4
              text-blue-700
            "
          >
            Select the venue,
            event date, start time,
            and end time. NUnified
            will automatically check
            approved bookings from
            all organizations.
          </p>
        </div>
      </div>
    );
  }

  if (
    status.state ===
    "checking"
  ) {
    return (
      <div
        className="
          mt-4
          flex
          items-center
          gap-3
          rounded-xl
          border
          border-gray-200
          bg-gray-50
          px-4
          py-3
        "
      >
        <MaterialIcon
          name="progress_activity"
          className="
            animate-spin
            text-[18px]
            text-blue-950
          "
        />

        <p
          className="
            text-[9px]
            font-bold
            text-gray-600
          "
        >
          Checking approved
          bookings...
        </p>
      </div>
    );
  }

  if (
    status.state ===
    "available"
  ) {
    return (
      <div
        className="
          mt-4
          flex
          items-start
          gap-3
          rounded-xl
          border
          border-green-200
          bg-green-50
          px-4
          py-3
        "
      >
        <MaterialIcon
          name="check_circle"
          className="
            mt-[1px]
            text-[19px]
            text-green-600
          "
        />

        <div>
          <p
            className="
              text-[9px]
              font-black
              text-green-800
            "
          >
            Schedule Available
          </p>

          <p
            className="
              mt-1
              text-[8px]
              leading-4
              text-green-700
            "
          >
            {status.message}
          </p>
        </div>
      </div>
    );
  }

  if (
    status.state ===
    "blocked"
  ) {
    return (
      <motion.div
        initial={{
          opacity:
            0,

          y:
            -4,
        }}
        animate={{
          opacity:
            1,

          y:
            0,
        }}
        className="
          mt-4
          flex
          items-start
          gap-3
          rounded-xl
          border
          border-red-200
          bg-red-50
          px-4
          py-3
        "
      >
        <MaterialIcon
          name="event_busy"
          className="
            mt-[1px]
            text-[20px]
            text-red-600
          "
        />

        <div>
          <p
            className="
              text-[9px]
              font-black
              text-red-800
            "
          >
            Schedule Occupied
          </p>

          <p
            className="
              mt-1
              text-[8px]
              leading-4
              text-red-700
            "
          >
            {status.message}
          </p>

          <p
            className="
              mt-1
              text-[8px]
              font-bold
              text-red-700
            "
          >
            Choose another date,
            time, or venue.
          </p>
        </div>
      </motion.div>
    );
  }

  if (
    status.state ===
    "error"
  ) {
    return (
      <div
        className="
          mt-4
          flex
          items-start
          gap-3
          rounded-xl
          border
          border-orange-200
          bg-orange-50
          px-4
          py-3
        "
      >
        <MaterialIcon
          name="warning"
          className="
            mt-[1px]
            text-[18px]
            text-orange-600
          "
        />

        <p
          className="
            text-[8px]
            leading-4
            text-orange-700
          "
        >
          {status.message}
        </p>
      </div>
    );
  }

  return null;
}

/* =====================================================
   SECTION HEADING
===================================================== */

function SectionHeading({
  icon,
  title,
  description,
}) {
  return (
    <div
      className="
        flex
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

      <div>
        <h2
          className="
            text-[18px]
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-1
            text-[9px]
            leading-4
            text-gray-500
          "
        >
          {description}
        </p>
      </div>
    </div>
  );
}

/* =====================================================
   FIELD LABEL
===================================================== */

function FieldLabel({
  htmlFor,
  required = false,
  children,
}) {
  return (
    <label
      htmlFor={
        htmlFor
      }
      className="
        text-[9px]
        font-black
        text-blue-950
      "
    >
      {children}

      {required && (
        <span
          className="
            ml-1
            text-red-500
          "
        >
          *
        </span>
      )}
    </label>
  );
}

/* =====================================================
   PDF UPLOAD CARD
===================================================== */

function PdfUploadCard({
  id,
  title,
  description,
  file,
  onChange,
  onRemove,
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-gray-200
        bg-gray-50
        p-4
      "
    >
      <div
        className="
          flex
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
            bg-red-100
            text-red-600
          "
        >
          <MaterialIcon
            name="picture_as_pdf"
            className="
              text-[20px]
            "
          />
        </div>

        <div
          className="
            min-w-0
            flex-1
          "
        >
          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <h3
              className="
                text-[11px]
                font-black
                text-blue-950
              "
            >
              {title}
            </h3>

            <span
              className="
                rounded-full
                bg-red-100
                px-2
                py-1
                text-[6px]
                font-black
                uppercase
                text-red-600
              "
            >
              Required PDF
            </span>
          </div>

          <p
            className="
              mt-1
              text-[8px]
              leading-4
              text-gray-500
            "
          >
            {description}
          </p>
        </div>
      </div>

      {!file ? (
        <label
          htmlFor={
            id
          }
          className="
            mt-4
            flex
            cursor-pointer
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-dashed
            border-gray-300
            bg-white
            px-4
            py-4
            text-[9px]
            font-black
            text-blue-700
            transition
            hover:border-yellow-400
            hover:bg-yellow-50
          "
        >
          <MaterialIcon
            name="upload_file"
            className="
              text-[19px]
            "
          />

          Choose PDF File

          <input
            id={
              id
            }
            type="file"
            accept=".pdf,application/pdf"
            onChange={
              onChange
            }
            className="
              sr-only
            "
          />
        </label>
      ) : (
        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            gap-3
            rounded-xl
            border
            border-green-200
            bg-green-50
            p-3
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-2
            "
          >
            <MaterialIcon
              name="check_circle"
              className="
                shrink-0
                text-[18px]
                text-green-600
              "
            />

            <div
              className="
                min-w-0
              "
            >
              <p
                className="
                  truncate
                  text-[8px]
                  font-black
                  text-green-800
                "
              >
                {file.name}
              </p>

              <p
                className="
                  mt-0.5
                  text-[7px]
                  text-green-700
                "
              >
                {
                  formatFileSize(
                    file.size
                  )
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onRemove
            }
            aria-label={`Remove ${title}`}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-red-600
              transition
              hover:bg-red-100
            "
          >
            <MaterialIcon
              name="delete"
              className="
                text-[17px]
              "
            />
          </button>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MESSAGE
===================================================== */

function MessageBox({
  type,
  text,
  onClose,
}) {
  const success =
    type ===
    "success";

  return (
    <div
      role={
        success
          ? "status"
          : "alert"
      }
      className={`
        flex
        items-center
        justify-between
        gap-3
        rounded-xl
        border
        px-4
        py-3

        ${
          success
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }
      `}
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <MaterialIcon
          name={
            success
              ? "check_circle"
              : "error"
          }
          className="
            shrink-0
            text-[18px]
          "
        />

        <p
          className="
            text-[9px]
            font-bold
          "
        >
          {text}
        </p>
      </div>

      <button
        type="button"
        onClick={
          onClose
        }
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          transition
          hover:bg-black/5
        "
      >
        <MaterialIcon
          name="close"
          className="
            text-[17px]
          "
        />
      </button>
    </div>
  );
}

/* =====================================================
   FILE SIZE
===================================================== */

function formatFileSize(
  bytes
) {
  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <=
      0
  ) {
    return "0 KB";
  }

  const megabytes =
    bytes /
    (
      1024 *
      1024
    );

  if (
    megabytes >=
    1
  ) {
    return `${megabytes.toFixed(
      2
    )} MB`;
  }

  return `${(
    bytes /
    1024
  ).toFixed(
    1
  )} KB`;
}