var ChromeSamples = {
  log: function () {
    var line = Array.prototype.slice
      .call(arguments)
      .map(function (argument) {
        return typeof argument === "string"
          ? argument
          : JSON.stringify(argument);
      })
      .join(" ");

    document.querySelector("#log").textContent += line + "\n";
  },

  setStatus: function (status) {
    document.querySelector("#status").textContent = status;
  },

  setContent: function (newContent) {
    var content = document.querySelector("#content");
    while (content.hasChildNodes()) {
      content.removeChild(content.lastChild);
    }
    content.appendChild(newContent);
  },
};

log = ChromeSamples.log;


function clearLogContent() {
  var logElement = document.getElementById("log");
  logElement.innerText = ""; 
}

// Set an interval to clear the log content every 24 hours
setInterval(clearLogContent, 24 * 60 * 60 * 1000);

document.addEventListener('DOMContentLoaded', function() {
  // Get the "name" parameter from the URL
  const urlSearchParams = new URLSearchParams(window.location.search);
  const studentName = urlSearchParams.get("name");
  
  // Log the extracted name for debugging
  console.log("Student Name:", studentName);

  // Get the heading element by its ID
  const studentNameHeaderElement = document.getElementById('studentNameHeader');

  // Check if the element exists and the name is available
  if (studentNameHeaderElement && studentName) {
    // Set the text content of the heading element
    studentNameHeaderElement.textContent = `${studentName}!`;
  } else {
    // Log a message if the element is not found or the name is not available
    console.log("Element not found or student name is not available.");
  }
});





if (!("NDEFReader" in window))
  ChromeSamples.setStatus("Web NFC is not available. Use Chrome on Android.");

scanButton.addEventListener("click", async () => {
  log("User clicked scan button");

  try {
    const ndef = new NDEFReader();
    ndef.scan();
    log("> Scan started");

    ndef.addEventListener("readingerror", () => {
      log("Argh! Cannot read data from the NFC tag. Try another one?");
    });

    ndef.addEventListener("reading", ({ message, serialNumber }) => {
      log(`> Serial Number: ${serialNumber}`);
      log(`> Records: (${message.records.length})`);

      if (message.records.length > 0) {
        log("Records:");
        message.records.forEach((record, index) => {
          const textContent = new TextDecoder().decode(record.data);
          log(`Record ${index + 1}: ${textContent}`);
        });
      }

      clearTimeout(timerId);
      ndef.stop();
    });
  } catch (error) {
    log("Argh! " + error);
  }
});

function writeButtonClick() {
  const urlParams = new URLSearchParams(window.location.search);
  const nameParam = urlParams.get("name");

  if (nameParam) {
    processStudentName(nameParam);
  } else {
    document.getElementById("studentForm").style.display = "block";
  }
}

function submitForm() {
  const studentNameFromInput = document.getElementById("studentName").value;
  processStudentName(studentNameFromInput);
}

function processStudentName(studentName) {
  try {
    const database = firebase.database();
    const studentsRef = database.ref("students");

    studentsRef
      .child(studentName)
      .once("value")
      .then(async (snapshot) => {
        if (snapshot.exists()) {
          const existingData = snapshot.val();
          document.getElementById("actionButtons").style.display = "block";
          if (existingData.serialNumber && existingData.uniqueNumber) {
            log(
              `User with name '${studentName}' has already registered with NFC.`
            );
          } else {
            log(`User with name '${studentName}' is not registered with NFC.`);
          }
        } else {
          log(`User with name '${studentName}' not found in the database.`);
        }
      })
      .catch((error) => {
        log("Error checking student name:", error.message);
      });
  } catch (error) {
    log("Argh! " + error);
  }
}

async function makeReadOnly() {
  log("User clicked make read-only button");

  try {
    const ndef = new NDEFReader();
    await ndef.scan();
    await ndef.makeReadOnly();
    log("> NFC tag has been made permanently read-only");
  } catch (error) {
    log("Argh! " + error);
  }
}

async function processAddConfirmation(studentName) {
  if (!("NDEFReader" in window)) {
    alert("Web NFC is not available. Use Chrome on Android.");
    return;
  }

  try {
    const ndef = new NDEFReader();
    await ndef.scan();
    document.getElementById("addModal").style.display = "none";
    log("> Scan started");

    ndef.addEventListener("readingerror", () => {
      log("Argh! Cannot read data from the NFC tag. Try another one?");
    });

    ndef.addEventListener("reading", async ({ message, serialNumber }) => {
      log(`> Serial Number: ${serialNumber}`);

      const database = firebase.database();
      const studentsRef = database.ref("students");

      try {
        const snapshot = await studentsRef.child(studentName).once("value");

        if (snapshot.exists()) {
          const existingData = snapshot.val();

          if (!existingData.uniqueNumber && !existingData.serialNumber) {
            const uniqueNumber = Date.now() + Math.floor(Math.random() * 1000);
            const nfcSerialNumber = serialNumber;

            try {
              const ndefWrite = new NDEFReader();
              const encodedStudentName = encodeURIComponent(studentName);
              const messageText = `Unique Number: ${uniqueNumber}, Student Name: ${studentName}`;
              const messageUrl = `https://live.olevels.com/coins-history/student/all/${encodedStudentName}/${uniqueNumber}`;

              await ndefWrite.write({
                records: [
                  { recordType: "url", data: messageUrl },
                  { recordType: "text", data: messageText },
                ],
              });

              log(`Message written successfully for ${studentName}.`);
              await studentsRef.child(studentName).update({
                uniqueNumber: uniqueNumber,
                serialNumber: nfcSerialNumber,
              });
            } catch (writeError) {
              log(`Write failed: ${writeError}`);
            }
          } else {
            alert(
              `Student with name '${studentName}' already has uniqueNumber and serialNumber.`
            );
          }
        } else {
          alert(`Student with name '${studentName}' not found.`);
        }
      } catch (readError) {
        log("Error checking student name:", readError.message);
        // Provide user feedback about database read error
        alert("Error checking student name. Please try again.");
      }
    });
  } catch (nfcError) {
    log(`Argh! ${nfcError}`);
    document.getElementById("addModal").style.display = "none";
    // Provide user feedback about NFC error
    alert("Error initializing NFC. Please try again.");
  }
}

function addAction() {
  const urlParams = new URLSearchParams(window.location.search);
  const nameParams = urlParams.get("name");
  if (nameParams) {
    processAddConfirmation(nameParams);
  } else {
    document.getElementById("addModal").style.display = "block";
  }
}
function addConfirmation() {
  const passwordInput = document.getElementById("passwordAdd");
  const password = passwordInput.value;

  if (password === "password") {
    const studentName = document.getElementById("studentName").value;
    processAddConfirmation(studentName);
  } else {
    log("Incorrect password. Add operation canceled.");
    closeAddModal();
  }
}

function deleteAction() {
  const urlParams = new URLSearchParams(window.location.search);
  const nameParam = urlParams.get("name");

  if (nameParam) {
    processDeleteConfirmation(nameParam);
  } else {
    document.getElementById("deleteModal").style.display = "block";
  }
}
function deleteConfirmation() {
  const passwordInput = document.getElementById("passwordDelete");
  const password = passwordInput.value;

  if (password === "password") {
    const studentName = document.getElementById("studentName").value;
    processDeleteConfirmation(studentName);
  } else {
    log("Incorrect password. Delete operation canceled.");
    closeDeleteModal();
  }
}
async function processDeleteConfirmation(studentName) {
  if (studentName) {
    const database = firebase.database();
    const studentsRef = database.ref("students");

    try {
      const studentSnapshot = await studentsRef
        .child(studentName)
        .once("value");

      if (studentSnapshot.exists()) {
        const studentData = studentSnapshot.val();

        if (studentData.serialNumber && studentData.uniqueNumber) {
          const serialNumber = studentData.serialNumber;
          const uniqueNumber = studentData.uniqueNumber;

          await studentsRef.child(studentName).update({
            serialNumber: null,
            uniqueNumber: null,
          });

          log(
            `Serial Number and Unique Number for student '${studentName}' deleted from the database.`
          );
          closeDeleteModal();
        } else {
          log("Student NFC is not registered");
          closeDeleteModal();
        }
      } else {
        log(`No student found with Name '${studentName}'.`);
        closeDeleteModal();
      }
    } catch (error) {
      log(`Error deleting student: ${error.message}`);
    }

    closeDeleteModal();
  } else {
    log("Student Name not found. Delete operation canceled.");
    closeDeleteModal();
  }
}

function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
}
function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
}

function openCricketGround() {
  window.open("cricket-ground.html", "_blank");
}

function openPlayGround() {
  window.open("play-ground.html", "_blank");
}

function openBigSlide() {
  window.open("big-slide.html", "_blank");
}

function openSwimmingPool() {
  window.open("swimming-pool.html", "_blank");
}

function openRacingCar() {
  window.open("racing-car.html", "_blank");
}
async function fetchCoinsForActivity(activity) {
  const snapshot = await firebase
    .database()
    .ref(`ActivityCoins/${activity}`)
    .once("value");
  return snapshot.val() || 0;
}
async function updateButton(activity, buttonId) {
  const coins = await fetchCoinsForActivity(activity);
  document.getElementById(buttonId).innerText = `${activity} (${coins} Coins)`;
}

document.addEventListener("DOMContentLoaded", async function () {
  await updateButton("Cricket Ground", "cricketButton");
  await updateButton("Play ground", "playButton");
  await updateButton("Big Slide", "bigButton");
  await updateButton("Swimming Pool", "swimmingButton");
  await updateButton("Racing Car", "racingButton");
});

function setCoins(activityName) {
  const password = prompt("Enter your password:");

  if (password === "password") {
    const coinsForActivity = prompt(`Enter coins for ${activityName}:`);

    setCoinsInFirebase(activityName, coinsForActivity);
  } else {
    alert("Invalid password. Cannot set coins.");
  }
}

async function setCoinsInFirebase(activityName, coinsForActivity) {
  const database = firebase.database();
  const activityCoinsRef = database.ref(`ActivityCoins/${activityName}`);

  try {
    activityCoinsRef.set(parseInt(coinsForActivity));
    alert(`Coins for ${activityName} set successfully.`);
  } catch (error) {
    console.error(`Error setting coins: ${error.message}`);
    alert(`Error setting coins for ${activityName}. Please try again.`);
  }
}

function closeAddModal() {
  document.getElementById("addModal").style.display = "none";
}

async function getNFCSerialNumber() {
  return new Promise((resolve, reject) => {
    const ndef = new NDEFReader();
    ndef.scan();
    ndef.addEventListener("reading", ({ serialNumber }) => {
      log(`> Serial Number: ${serialNumber}`);
      resolve(serialNumber);
    });
    setTimeout(() => {
      reject(new Error("Timeout: NFC reading took too long."));
    }, 50000);
  });
}
function openAdditionalInfoForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const studentNameinUrl = urlParams.get("name");

  if (studentNameinUrl) {
    document.getElementById("additionalInfoForm").style.display = "block";
    document.getElementById("modalContent").style.display = "block";
  } else {
    const passwordModal = document.getElementById("passwordModal");
    passwordModal.style.display = "block";

    const passwordInput = document.getElementById("passwordInput");
    const submitButton = document.getElementById("submitPassword");
    const cancelButton = document.getElementById("cancelPassword");

    cancelButton.addEventListener("click", function () {
      passwordModal.style.display = "none";
    });

    submitButton.addEventListener("click", function () {
      const enteredPassword = passwordInput.value;
      const teacherPassword = "password";

      if (enteredPassword === teacherPassword) {
        document.getElementById("passwordModal").style.display = "none";
        document.getElementById("studentNameContainer").style.display = "block";
      } else {
        alert("You are not a teacher. Access denied.");
      }
    });
  }
}

function closeAdditionalInfoForm() {
  document.getElementById("additionalInfoForm").style.display = "none";
  document.getElementById("modalContent").style.display = "none";
}

function dropdownValueSubmit() {
  document.getElementById("additionalInfoForm").style.display = "block";
  document.getElementById("modalContent").style.display = "block";
}

function previewImage() {
  const fileInput = document.getElementById("image");
  const imagePreview = document.getElementById("imagePreview");

  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      imagePreview.src = e.target.result;
    };

    reader.readAsDataURL(file);
  } else {
    imagePreview.src = "";
  }
}
async function fetchStudentNames() {
  const database = firebase.database();
  const studentsRef = database.ref("students");

  try {
    const snapshot = await studentsRef.once("value");
    const studentNames = Object.keys(snapshot.val() || {});

    const dropdown1 = document.getElementById("studentNameDropdown");
    const dropdown2 = document.getElementById("studentNameDropdownInfo");

    dropdown1.innerHTML = "";
    dropdown2.innerHTML = "";

    studentNames.forEach((name) => {
      const option1 = document.createElement("option");
      const option2 = document.createElement("option");

      option1.value = name;
      option1.text = name;
      dropdown1.appendChild(option1);

      option2.value = name;
      option2.text = name;
      dropdown2.appendChild(option2);
    });
  } catch (error) {
    console.error("Error fetching student names:", error.message);
  }
}

fetchStudentNames();

function submitAdditionalInfo() {
  const urlParams = new URLSearchParams(window.location.search);
  const studentNameinUrl = urlParams.get("name");
  const topic = urlParams.get("topic");

  if (studentNameinUrl && topic) {
    submitAdditionalInfoModal(studentNameinUrl);
  } else {
    const studentNameDropdown = document.getElementById("studentNameDropdown");
    studentName = studentNameDropdown.value.trim();
    submitAdditionalInfoModal(studentName);
  }
}

function submitAdditionalInfoModal(studentName) {
  if (!studentName) {
    alert("Please select a valid student name.");
    return;
  }

  // Validate blood group
  const bloodGroup = document.getElementById("bloodGroup").value;
  if (!bloodGroup) {
    alert("Please enter the blood group.");
    return;
  }

  // Validate address
  const address = document.getElementById("address").value;
  if (!address) {
    alert("Please enter the address.");
    return;
  }

  // Validate image
  const imageInput = document.getElementById("image");
  const image = imageInput.files[0];
  if (!image) {
    alert("Please select an image.");
    return;
  }

  const storageRef = firebase.storage().ref(`student_images/${studentName}`);

  storageRef
    .put(image)
    .then(() => {
      storageRef
        .getDownloadURL()
        .then((imageUrl) => {
          const database = firebase.database();
          const studentsRef = database.ref(`students/${studentName}`);

          studentsRef
            .update({
              bloodGroup: bloodGroup,
              address: address,
              imageUrl: imageUrl,
            })
            .then(() => {
              alert("Additional information submitted successfully.");
              closeAdditionalInfoForm();
              const urlParams = new URLSearchParams(window.location.search);
              const studentNameinUrl = urlParams.get("name");
              const topic = urlParams.get("topic");

              if (studentNameinUrl) {
                window.location.reload();
              } else {
                const newUrl =
                  window.location.href +
                  "?name=" +
                  encodeURIComponent(studentName);
                window.open(newUrl, "_blank");
                window.location.reload();
              }
            })
            .catch((error) => {
              console.error(
                "Error updating student information:",
                error.message
              );
            });
        })
        .catch((error) => {
          console.error("Error getting image download URL:", error.message);
        });
    })
    .catch((error) => {
      console.error("Error uploading image:", error.message);
    });
}

async function fetchStudentDetails(studentName) {
  const database = firebase.firestore();
  const studentsRef = database.collection("students");

  try {
    const querySnapshot = await studentsRef
      .where("name", "==", studentName)
      .get();

    if (!querySnapshot.empty) {
      const studentDoc = querySnapshot.docs[0].data();
      if (Array.isArray(studentDoc.topics) && studentDoc.topics.length > 0) {
        const firstTopic =
          studentDoc.topics[0].topic !== undefined
            ? studentDoc.topics[0].topic
            : null;
        const numbersArray = studentDoc.numbers || [];
        return {
          id: studentDoc.id,
          firstTopic: firstTopic,
          numbers: numbersArray,
        };
      } else {
        return null;
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching student details:", error.message);
    throw error;
  }
}

async function viewInformation() {
  const urlSearchParams = new URLSearchParams(window.location.search);
  const nameFromUrl = urlSearchParams.get("name");
  const topicFromUrl = urlSearchParams.get("topic");
  const id = urlSearchParams.get("id");
  console.log("nameFromUrl:", nameFromUrl);

  if (topicFromUrl && id) {
    const contactSnapshot = await firebase
      .database()
      .ref(
        `topics/${topicFromUrl}/students/${nameFromUrl}/numbers/student_phone`
      )
      .once("value");
    const fatherSnapshot = await firebase
      .database()
      .ref(
        `topics/${topicFromUrl}/students/${nameFromUrl}/numbers/father_phone`
      )
      .once("value");
    const motherSnapshot = await firebase
      .database()
      .ref(
        `topics/${topicFromUrl}/students/${nameFromUrl}/numbers/mother_phone`
      )
      .once("value");

    const contactNumber = contactSnapshot.val();
    const fatherNumber = fatherSnapshot.val();
    const motherNumber = motherSnapshot.val();
    if (contactSnapshot) {
      viewInformationDetails(
        nameFromUrl,
        topicFromUrl,
        id,
        contactNumber,
        fatherNumber,
        motherNumber
      );
    }
  } else if (nameFromUrl) {
    const database = firebase.firestore();
    const studentsRef = database.collection("students");

    try {
      const querySnapshot = await studentsRef
        .where("name", "==", nameFromUrl)
        .get();

      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0].data();
        if (Array.isArray(studentDoc.topics) && studentDoc.topics.length > 0) {
          const firstTopic =
            studentDoc.topics[0].topic !== undefined
              ? studentDoc.topics[0].topic
              : null;
          const numbersArray = studentDoc.numbers || [];

          const studentDetails = {
            id: studentDoc.id,
            firstTopic: firstTopic,
            numbers: numbersArray,
          };

          const studentTopic = studentDetails.firstTopic;
          const studentId = studentDetails.id;
          const studentNumbers = studentDetails.numbers || [
            "N/A",
            "N/A",
            "N/A",
          ];
          const [contact, fatherPhone, motherPhone] = studentNumbers;

          viewInformationDetails(
            nameFromUrl,
            studentTopic,
            studentId,
            contact,
            fatherPhone,
            motherPhone
          );
        } else {
          alert("No topic data found");
        }
      } else {
        alert("No data found");
      }
    } catch (error) {
      console.error("Error fetching student details:", error.message);
      alert("Error fetching student details. Please try again.");
    }
  } else {
    const passwordModal = document.getElementById("passwordModal");
    passwordModal.style.display = "block";

    const passwordInput = document.getElementById("passwordInput");
    const submitButton = document.getElementById("submitPassword");
    const cancelButton = document.getElementById("cancelPassword");

    cancelButton.addEventListener("click", function () {
      passwordModal.style.display = "none";
    });

    submitButton.addEventListener("click", async function () {
      const enteredPassword = passwordInput.value;
      const teacherPassword = "password";

      if (enteredPassword === teacherPassword) {
        passwordModal.style.display = "none";
        document.getElementById("studentNameInfo").style.display = "block";
      } else {
        alert("You are not a teacher. Access denied.");
      }
    });
  }
}

async function fetchStudentDetailsFromFirestore() {
  const studentNameDropdown = document.getElementById(
    "studentNameDropdownInfo"
  );
  studentName = studentNameDropdown.value.trim();
  const studentDetails = await fetchStudentDetails(studentName);

  if (studentDetails) {
    const studentTopic = studentDetails.firstTopic;
    const studentId = studentDetails.id;
    const studentNumbers = studentDetails.numbers || ["N/A", "N/A", "N/A"];
    const [contact, fatherPhone, motherPhone] = studentNumbers;

    viewInformationDetails(
      studentName,
      studentTopic,
      studentId,
      contact,
      fatherPhone,
      motherPhone
    );
  } else {
    alert("No data found");
  }
}

function copyToClipboard() {
  var infoToCopy = getStudentInfo();

  var tempElement = document.createElement("textarea");
  tempElement.value = infoToCopy;
  document.body.appendChild(tempElement);
  tempElement.select();
  document.execCommand("copy");
  document.body.removeChild(tempElement);

  alert("Information copied to clipboard!");
}

function getStudentInfo() {
  var name = $("#modalStudentName").text();
  var bloodGroup = $("#modalBloodGroup").text();
  var contact = $("#modalContact").text();
  var father = $("#modalFather").text();
  var mother = $("#modalMother").text();
  var address = $("#modalAddress").text();
  var imageUrl = $("#modalImgUrl").text();

  // Construct the information string
  var infoToCopy =
    "Name: " +
    name +
    "\nBlood Group: " +
    bloodGroup +
    "\nContact: " +
    contact +
    "\nFather: " +
    father +
    "\nMother: " +
    mother +
    "\nAddress: " +
    address +
    "\nImageUrl: " +
    imageUrl;

  return infoToCopy;
}
async function viewInformationDetails(
  nameFromUrl,
  topicFromUrl,
  id,
  contactNumber,
  fatherNumber,
  motherNumber
) {
  if (!nameFromUrl || !topicFromUrl) {
    console.log("Name or topic not found in the URL");
    return;
  }

  try {
    const studentSnapshot = await firebase
      .database()
      .ref(`students/${nameFromUrl}`)
      .once("value");
    const studentInfo = studentSnapshot.val();
    if (studentInfo) {
      document.getElementById(
        "modalStudentName"
      ).innerText = `${nameFromUrl} (${id})`;
      document.getElementById("modalBloodGroup").innerText =
        studentInfo.bloodGroup || "N/A";
      document.getElementById("modalContact").innerText =
        contactNumber || "N/A";
      document.getElementById("modalFather").innerText = fatherNumber || "N/A";
      document.getElementById("modalMother").innerText = motherNumber || "N/A";
      document.getElementById("modalAddress").innerText =
        studentInfo.address || "N/A";
      document.getElementById("modalImgUrl").innerText =
        studentInfo.imageUrl || "N/A";
      document.getElementById("modalStudentImage").src =
        studentInfo.imageUrl || "N/A";

      document.getElementById("infoDisplay").style.display = "block";
    } else {
      alert("No data found");
    }
  } catch (error) {
    console.error("Error fetching data from Firebase:", error);
  }
}
