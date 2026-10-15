import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  motion,
} from "framer-motion";

import api from "../../api/axiosClient.js";

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
   EMPTY ORGANIZATION
===================================================== */

const EMPTY_ORGANIZATION = {
  organizationName: "",
  acronym: "",
  email: "",
  contactNumber: "",
  adviser: "",
  description: "",
  color: "#FACC15",
};

/* =====================================================
   PAGE
===================================================== */

export default function OrganizationProfile() {
  const navigate =
    useNavigate();

  const [
    organization,
    setOrganization,
  ] = useState(
    EMPTY_ORGANIZATION
  );

  /*
    Profile image is stored separately
    from organization information.
  */

  const [
    profileImage,
    setProfileImage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    showEdit,
    setShowEdit,
  ] = useState(false);

  /* =====================================================
     CUSTOM REMOVE PICTURE CONFIRMATION
  ===================================================== */

  const [
    showRemovePictureConfirm,
    setShowRemovePictureConfirm,
  ] = useState(false);

  const [
    editForm,
    setEditForm,
  ] = useState({
    adviser: "",
    contactNumber: "",
    description: "",
  });

  /* ===================================================
     LOAD ORGANIZATION + SAVED PICTURE
  =================================================== */

  const loadProfile =
    async () => {
      setLoading(true);
      setError("");

      try {
        /* =============================================
           ORGANIZATION
        ============================================= */

        const orgResponse =
          await api.get(
            "/organizations/me"
          );

        const org =
          orgResponse.data
            ?.organization ||
          orgResponse.data ||
          {};

        setOrganization({
          ...EMPTY_ORGANIZATION,
          ...org,
        });

        /* =============================================
           SAVED PROFILE PICTURE
        ============================================= */

        try {
          const pictureResponse =
            await api.get(
              "/organization-profile/me/profile-picture"
            );

          const savedPicture =
            pictureResponse.data
              ?.profileImage ||
            "";

          console.log(
            "SAVED PROFILE PICTURE:",
            {
              exists:
                Boolean(
                  savedPicture
                ),

              length:
                savedPicture.length,
            }
          );

          setProfileImage(
            savedPicture
          );
        } catch (
          pictureError
        ) {
          console.error(
            "LOAD PROFILE PICTURE ERROR:",
            pictureError
          );

          setProfileImage(
            ""
          );
        }
      } catch (
        err
      ) {
        console.error(
          "LOAD ORGANIZATION ERROR:",
          err
        );

        setError(
          err.response
            ?.data
            ?.message ||
            "Unable to load organization profile."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(
    () => {
      loadProfile();
    },
    []
  );

  /* ===================================================
     PREPARE IMAGE

     Resize to 500x500 maximum.
     JPEG 75%.

     This keeps the MongoDB image small.
  =================================================== */

  const prepareImage =
    (
      file
    ) =>
      new Promise(
        (
          resolve,
          reject
        ) => {
          const reader =
            new FileReader();

          reader.onerror =
            () =>
              reject(
                new Error(
                  "Unable to read image."
                )
              );

          reader.onload =
            () => {
              const image =
                new Image();

              image.onerror =
                () =>
                  reject(
                    new Error(
                      "Invalid image."
                    )
                  );

              image.onload =
                () => {
                  const maxSize =
                    500;

                  let width =
                    image.width;

                  let height =
                    image.height;

                  if (
                    width >
                      maxSize ||
                    height >
                      maxSize
                  ) {
                    const ratio =
                      Math.min(
                        maxSize /
                          width,

                        maxSize /
                          height
                      );

                    width =
                      Math.round(
                        width *
                          ratio
                      );

                    height =
                      Math.round(
                        height *
                          ratio
                      );
                  }

                  const canvas =
                    document.createElement(
                      "canvas"
                    );

                  canvas.width =
                    width;

                  canvas.height =
                    height;

                  const context =
                    canvas.getContext(
                      "2d"
                    );

                  context.drawImage(
                    image,
                    0,
                    0,
                    width,
                    height
                  );

                  const dataUrl =
                    canvas.toDataURL(
                      "image/jpeg",
                      0.75
                    );

                  resolve(
                    dataUrl
                  );
                };

              image.src =
                reader.result;
            };

          reader.readAsDataURL(
            file
          );
        }
      );

  /* ===================================================
     UPLOAD PICTURE
  =================================================== */

  const handleImageChange =
    async (
      event
    ) => {
      const file =
        event.target
          .files?.[0];

      event.target.value =
        "";

      if (
        !file
      ) {
        return;
      }

      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowed.includes(
          file.type
        )
      ) {
        setError(
          "Only JPG, PNG, and WEBP images are allowed."
        );

        return;
      }

      if (
        file.size >
        5 *
          1024 *
          1024
      ) {
        setError(
          "Please choose an image smaller than 5 MB."
        );

        return;
      }

      setUploading(
        true
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );

      try {
        const preparedImage =
          await prepareImage(
            file
          );

        /*
          Show immediately.
        */

        setProfileImage(
          preparedImage
        );

        /*
          Save permanently to MongoDB.
        */

        const response =
          await api.put(
            "/organization-profile/me/profile-picture",

            {
              profileImage:
                preparedImage,
            }
          );

        const saved =
          response.data
            ?.profileImage ||
          preparedImage;

        setProfileImage(
          saved
        );

        console.log(
          "PICTURE SAVED:",
          {
            exists:
              Boolean(
                saved
              ),

            length:
              saved.length,
          }
        );

        setSuccess(
          response.data
            ?.message ||
            "Profile picture saved successfully."
        );
      } catch (
        err
      ) {
        console.error(
          "SAVE PROFILE PICTURE ERROR:",
          err
        );

        setError(
          err.response
            ?.data
            ?.message ||
            "Unable to save profile picture."
        );

        /*
          Reload database version if
          save failed.
        */

        await loadProfile();
      } finally {
        setUploading(
          false
        );
      }
    };

  /* ===================================================
     OPEN REMOVE PICTURE CONFIRMATION

     This replaces window.confirm().
  =================================================== */

  const openRemovePictureConfirm =
    () => {
      if (
        uploading
      ) {
        return;
      }

      setShowRemovePictureConfirm(
        true
      );
    };

  /* ===================================================
     REMOVE PICTURE
  =================================================== */

  const removeProfileImage =
    async () => {
      setUploading(
        true
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );

      try {
        const response =
          await api.delete(
            "/organization-profile/me/profile-picture"
          );

        setProfileImage(
          ""
        );

        setShowRemovePictureConfirm(
          false
        );

        setSuccess(
          response.data
            ?.message ||
            "Profile picture removed successfully."
        );
      } catch (
        err
      ) {
        console.error(
          "REMOVE PROFILE PICTURE ERROR:",
          err
        );

        setError(
          err.response
            ?.data
            ?.message ||
            "Unable to remove profile picture."
        );
      } finally {
        setUploading(
          false
        );
      }
    };

  /* ===================================================
     EDIT PROFILE
  =================================================== */

  const openEdit =
    () => {
      setEditForm({
        adviser:
          organization
            .adviser ||
          "",

        contactNumber:
          organization
            .contactNumber ||
          "",

        description:
          organization
            .description ||
          "",
      });

      setError(
        ""
      );

      setSuccess(
        ""
      );

      setShowEdit(
        true
      );
    };

  const handleEditChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } =
        event.target;

      setEditForm(
        (
          previous
        ) => ({
          ...previous,

          [name]:
            value,
        })
      );
    };

  /* ===================================================
     SAVE TEXT PROFILE
  =================================================== */

  const saveProfile =
    async (
      event
    ) => {
      event.preventDefault();

      setSaving(
        true
      );

      setError(
        ""
      );

      setSuccess(
        ""
      );

      try {
        const response =
          await api.put(
            "/organizations/me",

            {
              adviser:
                editForm
                  .adviser
                  .trim(),

              contactNumber:
                editForm
                  .contactNumber
                  .trim(),

              description:
                editForm
                  .description
                  .trim(),
            }
          );

        const updated =
          response.data
            ?.organization ||
          {};

        setOrganization(
          (
            previous
          ) => ({
            ...previous,
            ...updated,
          })
        );

        setShowEdit(
          false
        );

        setSuccess(
          response.data
            ?.message ||
            "Organization profile updated successfully."
        );
      } catch (
        err
      ) {
        console.error(
          "UPDATE PROFILE ERROR:",
          err
        );

        setError(
          err.response
            ?.data
            ?.message ||
            "Unable to update organization profile."
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  /* ===================================================
     LOGOUT
  =================================================== */

  const handleLogout =
    () => {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "role"
      );

      localStorage.removeItem(
        "user"
      );

      navigate(
        "/login",

        {
          replace:
            true,
        }
      );
    };

  /* ===================================================
     INITIALS
  =================================================== */

  const initials =
    organization
      .acronym
      ?.trim()
      .slice(
        0,
        4
      )
      .toUpperCase() ||
    "NU";

  /* ===================================================
     LOADING
  =================================================== */

  if (
    loading
  ) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
        "
      >
        <div
          className="
            text-center
          "
        >
          <MaterialIcon
            name="hourglass_top"
            className="
              text-[30px]
              text-yellow-500
            "
          />

          <p
            className="
              mt-3
              text-[11px]
              font-bold
              text-blue-950
            "
          >
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  /* ===================================================
     UI
  =================================================== */

  return (
    <>
      <div
        className="
          mx-auto
          w-full
          max-w-[900px]
          space-y-5
        "
      >
        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <Alert
            type="error"
            message={
              error
            }
            onClose={() =>
              setError(
                ""
              )
            }
          />
        )}

        {success && (
          <Alert
            type="success"
            message={
              success
            }
            onClose={() =>
              setSuccess(
                ""
              )
            }
          />
        )}

        {/* =================================================
            HEADER
        ================================================= */}

        <motion.section
          initial={{
            opacity:
              0,

            y:
              15,
          }}
          animate={{
            opacity:
              1,

            y:
              0,
          }}
          className="
            overflow-hidden

            rounded-[20px]

            bg-gradient-to-r
            from-[#0B1A38]
            via-[#0B294B]
            to-[#144C7A]

            px-7
            py-7

            text-white
          "
        >
          <div
            className="
              flex
              flex-col
              items-center
              gap-7

              md:flex-row
            "
          >
            {/* =================================================
                PROFILE PHOTO
            ================================================= */}

            <div
              className="
                shrink-0
                text-center
              "
            >
              <div
                className="
                  relative

                  flex
                  h-[115px]
                  w-[115px]
                  items-center
                  justify-center

                  overflow-hidden

                  rounded-full

                  border-[3px]
                  border-yellow-300

                  shadow-lg
                "
                style={{
                  backgroundColor:
                    organization
                      .color ||
                    "#FACC15",
                }}
              >
                {profileImage ? (
                  <img
                    src={
                      profileImage
                    }
                    alt={`${organization.organizationName} Profile`}
                    className="
                      absolute
                      inset-0

                      h-full
                      w-full

                      object-cover
                      object-center
                    "
                  />
                ) : (
                  <span
                    className="
                      text-[28px]
                      font-black
                      text-blue-950
                    "
                  >
                    {
                      initials
                    }
                  </span>
                )}
              </div>

              {/* =================================================
                  CHANGE PICTURE
              ================================================= */}

              <label
                className={`
                  mt-3

                  inline-flex
                  cursor-pointer
                  items-center
                  justify-center
                  gap-1.5

                  rounded-full

                  bg-yellow-400

                  px-4
                  py-2

                  text-[10px]
                  font-black
                  text-blue-950

                  transition

                  hover:bg-yellow-300

                  ${
                    uploading
                      ? "pointer-events-none opacity-60"
                      : ""
                  }
                `}
              >
                <MaterialIcon
                  name={
                    uploading
                      ? "hourglass_top"
                      : "photo_camera"
                  }
                  className="
                    text-[15px]
                  "
                />

                {uploading
                  ? "Saving..."
                  : profileImage
                    ? "Change Picture"
                    : "Add Picture"}

                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handleImageChange
                  }
                />
              </label>

              {/* =================================================
                  REMOVE PICTURE
              ================================================= */}

              {profileImage && (
                <button
                  type="button"
                  disabled={
                    uploading
                  }
                  onClick={
                    openRemovePictureConfirm
                  }
                  className="
                    mx-auto
                    mt-2
                    block

                    text-[8px]
                    font-bold
                    text-red-200

                    transition

                    hover:text-red-100

                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Remove Picture
                </button>
              )}
            </div>

            {/* =================================================
                ORGANIZATION INFO
            ================================================= */}

            <div
              className="
                text-center

                md:text-left
              "
            >
              <span
                className="
                  inline-flex

                  rounded-full

                  bg-yellow-400/20

                  px-3
                  py-1

                  text-[9px]
                  font-black
                  text-yellow-300
                "
              >
                Organization Account
              </span>

              <h1
                className="
                  mt-3

                  text-[30px]
                  font-black
                "
              >
                {organization
                  .organizationName ||
                  "Organization"}
              </h1>

              <p
                className="
                  mt-1

                  text-[12px]
                  font-bold
                  text-gray-200
                "
              >
                {
                  organization
                    .acronym
                }
              </p>

              <p
                className="
                  mt-4

                  max-w-lg

                  text-[11px]
                  leading-5
                  text-gray-300
                "
              >
                {organization
                  .description ||
                  "No organization description has been added yet."}
              </p>
            </div>
          </div>
        </motion.section>

        {/* =================================================
            INFORMATION
        ================================================= */}

        <div
          className="
            grid
            gap-4

            md:grid-cols-2
          "
        >
          <InfoCard
            icon="business"
            title="Organization Information"
            items={[
              {
                label:
                  "Organization Name",

                value:
                  organization
                    .organizationName,
              },

              {
                label:
                  "Acronym",

                value:
                  organization
                    .acronym,
              },

              {
                label:
                  "Adviser",

                value:
                  organization
                    .adviser,
              },
            ]}
          />

          <InfoCard
            icon="contact_mail"
            title="Contact Information"
            items={[
              {
                label:
                  "Email Address",

                value:
                  organization
                    .email,
              },

              {
                label:
                  "Contact Number",

                value:
                  organization
                    .contactNumber,
              },
            ]}
          />
        </div>

        {/* =================================================
            ACCOUNT MANAGEMENT
        ================================================= */}

        <section
          className="
            rounded-[20px]

            bg-white

            p-6

            shadow-sm
          "
        >
          <h2
            className="
              text-[20px]
              font-black
              text-blue-950
            "
          >
            Account Management
          </h2>

          <p
            className="
              mt-1

              text-[11px]
              text-gray-500
            "
          >
            Manage your organization
            information and account.
          </p>

          <div
            className="
              mt-5

              grid
              gap-3

              sm:grid-cols-2
            "
          >
            {/* =================================================
                EDIT PROFILE
            ================================================= */}

            <button
              type="button"
              onClick={
                openEdit
              }
              className="
                rounded-xl

                bg-gray-100

                p-4

                text-left

                transition

                hover:-translate-y-0.5
                hover:bg-blue-50
                hover:shadow-md
              "
            >
              <MaterialIcon
                name="edit"
                className="
                  text-[20px]
                  text-yellow-500
                "
              />

              <h3
                className="
                  mt-3

                  text-[12px]
                  font-black
                  text-blue-950
                "
              >
                Edit Profile
              </h3>

              <p
                className="
                  mt-1

                  text-[10px]
                  text-gray-600
                "
              >
                Update organization
                information.
              </p>
            </button>

            {/* =================================================
                CHANGE PASSWORD
            ================================================= */}

            <Link
              to="/organization/change-password"
              className="
                rounded-xl

                bg-gray-100

                p-4

                transition

                hover:-translate-y-0.5
                hover:bg-yellow-50
                hover:shadow-md
              "
            >
              <MaterialIcon
                name="lock"
                className="
                  text-[20px]
                  text-yellow-500
                "
              />

              <h3
                className="
                  mt-3

                  text-[12px]
                  font-black
                  text-blue-950
                "
              >
                Change Password
              </h3>

              <p
                className="
                  mt-1

                  text-[10px]
                  text-gray-600
                "
              >
                Update your account
                security.
              </p>
            </Link>

            {/* =================================================
                ADMIN REQUEST
            ================================================= */}

            <Link
              to="/organization/admin-request"
              className="
                rounded-xl

                bg-gray-100

                p-4

                transition

                hover:-translate-y-0.5
                hover:bg-yellow-50
                hover:shadow-md
              "
            >
              <MaterialIcon
                name="support_agent"
                className="
                  text-[20px]
                  text-yellow-500
                "
              />

              <h3
                className="
                  mt-3

                  text-[12px]
                  font-black
                  text-blue-950
                "
              >
                Admin Request
              </h3>

              <p
                className="
                  mt-1

                  text-[10px]
                  text-gray-600
                "
              >
                Send concerns and
                requests.
              </p>
            </Link>

            {/* =================================================
                LOGOUT
            ================================================= */}

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="
                rounded-xl

                bg-red-50

                p-4

                text-left

                transition

                hover:bg-red-100
              "
            >
              <MaterialIcon
                name="logout"
                className="
                  text-[20px]
                  text-red-600
                "
              />

              <h3
                className="
                  mt-3

                  text-[12px]
                  font-black
                  text-red-700
                "
              >
                Sign Out
              </h3>

              <p
                className="
                  mt-1

                  text-[10px]
                  text-red-600
                "
              >
                Logout your account.
              </p>
            </button>
          </div>
        </section>
      </div>

      {/* =================================================
          REMOVE PROFILE PICTURE CONFIRMATION

          CUSTOM MODAL
          NO browser "vercel.app says" popup.
      ================================================= */}

      {showRemovePictureConfirm && (
        <div
          className="
            fixed
            inset-0
            z-[5000]

            flex
            items-center
            justify-center

            bg-black/65

            p-4

            backdrop-blur-sm
          "
          onClick={() => {
            if (
              !uploading
            ) {
              setShowRemovePictureConfirm(
                false
              );
            }
          }}
        >
          <motion.div
            initial={{
              opacity:
                0,

              scale:
                0.95,

              y:
                10,
            }}
            animate={{
              opacity:
                1,

              scale:
                1,

              y:
                0,
            }}
            transition={{
              duration:
                0.18,
            }}
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            className="
              w-full
              max-w-[430px]

              overflow-hidden

              rounded-[20px]

              bg-white

              shadow-2xl
            "
          >
            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div
              className="
                bg-gradient-to-r
                from-[#07152F]
                via-[#08284A]
                to-[#0B4B79]

                px-6
                py-5

                text-white
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center

                    rounded-xl

                    bg-red-500/15

                    text-red-300
                  "
                >
                  <MaterialIcon
                    name="delete"
                    className="
                      text-[23px]
                    "
                  />
                </div>

                <div>
                  <p
                    className="
                      text-[8px]
                      font-black
                      uppercase
                      tracking-[0.15em]
                      text-yellow-400
                    "
                  >
                    Confirmation
                  </p>

                  <h2
                    className="
                      mt-1

                      text-[19px]
                      font-black
                    "
                  >
                    Remove Profile Picture?
                  </h2>
                </div>
              </div>
            </div>

            {/* =================================================
                MODAL CONTENT
            ================================================= */}

            <div
              className="
                px-6
                py-5
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-3

                  rounded-xl

                  border
                  border-red-100

                  bg-red-50

                  p-4
                "
              >
                <MaterialIcon
                  name="warning"
                  className="
                    mt-[1px]

                    shrink-0

                    text-[20px]
                    text-red-500
                  "
                />

                <div>
                  <p
                    className="
                      text-[11px]
                      font-black
                      text-red-800
                    "
                  >
                    Are you sure?
                  </p>

                  <p
                    className="
                      mt-1

                      text-[10px]
                      leading-5
                      text-red-700
                    "
                  >
                    Your current
                    organization profile
                    picture will be removed.
                    You can upload another
                    picture anytime.
                  </p>
                </div>
              </div>

              {/* =================================================
                  MODAL BUTTONS
              ================================================= */}

              <div
                className="
                  mt-5

                  grid
                  grid-cols-2
                  gap-3
                "
              >
                {/* CANCEL */}

                <button
                  type="button"
                  disabled={
                    uploading
                  }
                  onClick={() =>
                    setShowRemovePictureConfirm(
                      false
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

                    bg-gray-100

                    px-4

                    text-[10px]
                    font-black
                    text-blue-950

                    transition

                    hover:bg-gray-200

                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <MaterialIcon
                    name="close"
                    className="
                      text-[17px]
                    "
                  />

                  Cancel
                </button>

                {/* REMOVE */}

                <button
                  type="button"
                  disabled={
                    uploading
                  }
                  onClick={
                    removeProfileImage
                  }
                  className="
                    flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-red-600

                    px-4

                    text-[10px]
                    font-black
                    text-white

                    transition

                    hover:bg-red-700

                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {uploading ? (
                    <>
                      <MaterialIcon
                        name="progress_activity"
                        className="
                          animate-spin
                          text-[17px]
                        "
                      />

                      Removing...
                    </>
                  ) : (
                    <>
                      <MaterialIcon
                        name="delete"
                        className="
                          text-[17px]
                        "
                      />

                      Remove Picture
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* =================================================
          EDIT PROFILE MODAL
      ================================================= */}

      {showEdit && (
        <div
          className="
            fixed
            inset-0
            z-[4000]

            flex
            items-center
            justify-center

            bg-black/65

            p-4

            backdrop-blur-sm
          "
          onClick={() =>
            !saving &&
            setShowEdit(
              false
            )
          }
        >
          <motion.form
            initial={{
              opacity:
                0,

              scale:
                0.97,
            }}
            animate={{
              opacity:
                1,

              scale:
                1,
            }}
            onSubmit={
              saveProfile
            }
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
            className="
              w-full
              max-w-lg

              rounded-2xl

              bg-white

              p-5

              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
              "
            >
              <div>
                <p
                  className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-yellow-600
                  "
                >
                  Organization
                </p>

                <h2
                  className="
                    mt-1

                    text-[19px]
                    font-black
                    text-blue-950
                  "
                >
                  Edit Profile
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowEdit(
                    false
                  )
                }
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center

                  rounded-full

                  bg-gray-100
                "
              >
                <MaterialIcon
                  name="close"
                />
              </button>
            </div>

            {/* =================================================
                ADVISER
            ================================================= */}

            <div
              className="
                mt-5
              "
            >
              <FieldLabel>
                Adviser
              </FieldLabel>

              <input
                name="adviser"
                value={
                  editForm
                    .adviser
                }
                onChange={
                  handleEditChange
                }
                className={
                  inputClass
                }
              />
            </div>

            {/* =================================================
                CONTACT
            ================================================= */}

            <div
              className="
                mt-4
              "
            >
              <FieldLabel>
                Contact Number
              </FieldLabel>

              <input
                name="contactNumber"
                value={
                  editForm
                    .contactNumber
                }
                onChange={
                  handleEditChange
                }
                className={
                  inputClass
                }
              />
            </div>

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <div
              className="
                mt-4
              "
            >
              <FieldLabel>
                Description
              </FieldLabel>

              <textarea
                name="description"
                value={
                  editForm
                    .description
                }
                onChange={
                  handleEditChange
                }
                rows="5"
                className={`
                  ${inputClass}

                  h-auto
                  resize-none
                  py-3
                `}
              />
            </div>

            {/* =================================================
                BUTTONS
            ================================================= */}

            <div
              className="
                mt-5

                grid
                grid-cols-2
                gap-3
              "
            >
              <button
                type="button"
                onClick={() =>
                  setShowEdit(
                    false
                  )
                }
                className="
                  rounded-xl

                  bg-gray-100

                  py-2.5

                  text-[10px]
                  font-black
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="
                  rounded-xl

                  bg-yellow-400

                  py-2.5

                  text-[10px]
                  font-black
                  text-blue-950

                  disabled:opacity-50
                "
              >
                {saving
                  ? "Saving..."
                  : "Save Profile"}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </>
  );
}

/* =====================================================
   INPUT
===================================================== */

const inputClass = `
  mt-1.5
  h-10
  w-full

  rounded-xl

  border
  border-gray-200

  px-3

  text-[11px]
  text-blue-950

  outline-none

  focus:border-yellow-400
  focus:ring-2
  focus:ring-yellow-400/20
`;

/* =====================================================
   LABEL
===================================================== */

function FieldLabel({
  children,
}) {
  return (
    <label
      className="
        text-[10px]
        font-black
        text-blue-950
      "
    >
      {children}
    </label>
  );
}

/* =====================================================
   INFORMATION CARD
===================================================== */

function InfoCard({
  icon,
  title,
  items,
}) {
  return (
    <div
      className="
        rounded-[20px]

        bg-white

        p-5

        shadow-sm
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <MaterialIcon
          name={
            icon
          }
          className="
            text-[21px]
            text-yellow-500
          "
        />

        <h2
          className="
            text-[16px]
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>
      </div>

      <div
        className="
          mt-5
          space-y-4
        "
      >
        {items.map(
          (
            item,
            index
          ) => (
            <div
              key={
                `${item.label}-${index}`
              }
            >
              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  text-gray-500
                "
              >
                {
                  item.label
                }
              </p>

              <p
                className="
                  mt-1

                  break-words

                  text-[11px]
                  font-bold
                  text-blue-950
                "
              >
                {item.value ||
                  "Not provided"}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* =====================================================
   ALERT
===================================================== */

function Alert({
  type,
  message,
  onClose,
}) {
  const success =
    type ===
    "success";

  return (
    <div
      className={`
        flex
        items-center
        justify-between
        gap-3

        rounded-xl

        border

        px-4
        py-3

        text-[10px]
        font-bold

        ${
          success
            ? `
              border-green-200
              bg-green-50
              text-green-700
            `
            : `
              border-red-200
              bg-red-50
              text-red-700
            `
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
            text-[16px]
          "
        />

        <span>
          {message}
        </span>
      </div>

      <button
        type="button"
        onClick={
          onClose
        }
      >
        <MaterialIcon
          name="close"
          className="
            text-[15px]
          "
        />
      </button>
    </div>
  );
}