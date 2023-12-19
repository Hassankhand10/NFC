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

if (!("NDEFReader" in window))
  ChromeSamples.setStatus("Web NFC is not available. Use Chrome on Android.");

//   document.addEventListener('DOMContentLoaded', function () {
//     console.log('DOM is loaded');
//     const studentNameInput = document.getElementById('studentName');

//     studentNameInput.value = '';

// });
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
    const nameParam = urlParams.get('name');

    if (nameParam) {
        
        processStudentName(nameParam)

    } else {
        
        document.getElementById('studentForm').style.display = 'block';
    }
}

function submitForm() {
    const studentNameFromInput = document.getElementById('studentName').value;
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
                        log(
                            `User with name '${studentName}' is not registered with NFC.`
                        );
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



async function processAddConfirmation(studentName) {
    
    if (!("NDEFReader" in window)) {
      alert("Web NFC is not available. Use Chrome on Android.");
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
                const uniqueNumber =
                  Date.now() + Math.floor(Math.random() * 1000);
                const nfcSerialNumber = serialNumber;
  
                try {
                  const ndefWrite = new NDEFReader();
                  const encodedStudentName = encodeURIComponent(studentName);
                  log(encodedStudentName);
                  await ndefWrite.write(
                    `Unique Number: ${uniqueNumber}, Student Name: ${studentName}, URL: http://10.171.171.52:4200/coins-history/student/all/${encodedStudentName}/${uniqueNumber}`
                  );
  
                  log("Message written successfully.");
                  log(`Data updated for student: ${studentName}`);
                  await studentsRef.child(studentName).update({
                    uniqueNumber: uniqueNumber,
                    serialNumber: nfcSerialNumber,
                  });
                } catch (error) {
                  log(`Write failed: ${error}`);
                }
              } else {
                alert(
                  `Student with name '${studentName}' already has uniqueNumber and serialNumber.`
                );
              }
            } else {
              alert(`Student with name '${studentName}' not found.`);
            }
          } catch (error) {
            log("Error checking student name:", error.message);
          }
        });
      } catch (error) {
        log("Argh! " + error);
        document.getElementById("addModal").style.display = "none";
      }
    }

   function addAction() {
    const urlParams = new URLSearchParams(window.location.search)
    const nameParams = urlParams.get('name')
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
      processAddConfirmation(studentName)
  }
  else {
      log("Incorrect password. Add operation canceled.");
      closeAddModal();
    }
  }
  
  function deleteAction() {
    const urlParams = new URLSearchParams(window.location.search);
    const nameParam = urlParams.get('name');
  
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
    processDeleteConfirmation(studentName)
}
else {
    log("Incorrect password. Delete operation canceled.");
    closeDeleteModal();
  }
}
async function processDeleteConfirmation(studentName) {
    if (studentName) {
      const database = firebase.database();
      const studentsRef = database.ref("students");
  
      try {
        const studentSnapshot = await studentsRef.child(studentName).once("value");
  
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
    document.getElementById("additionalInfoForm").style.display = "block";
    document.getElementById("modalContent").style.display = "block";
}

function closeAdditionalInfoForm() {
    document.getElementById("additionalInfoForm").style.display = "none";
    document.getElementById("modalContent").style.display = "none";
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
function submitAdditionalInfo() {
    const bloodGroup = document.getElementById("bloodGroup").value;
    const address = document.getElementById("address").value;
    const image = document.getElementById("image").files[0];

    const urlParams = new URLSearchParams(window.location.search);
    const studentName = urlParams.get('name');

    if (!studentName) {
        alert("You are not allowed. Only teachers are allowed to perform this action.");
        return;
    }
    const storageRef = firebase.storage().ref(`student_images/${studentName}`);

    storageRef.put(image).then(() => {
        storageRef.getDownloadURL().then((imageUrl) => {
            const database = firebase.database();
            const studentsRef = database.ref(`students/${studentName}`);
            studentsRef.update({
                bloodGroup: bloodGroup,
                address: address,
                imageUrl: imageUrl, 
            }).then(() => {
                alert("Additional information submitted successfully.");
                closeAdditionalInfoForm();
            }).catch((error) => {
                console.error("Error updating student information:", error.message);
            });
        }).catch((error) => {
            console.error("Error getting image download URL:", error.message);
        });
    }).catch((error) => {
        console.error("Error uploading image:", error.message);
    });
}
async function viewInformation() {
    // Get the name and topic from the URL
    const urlSearchParams = new URLSearchParams(window.location.search);
    const nameFromUrl = urlSearchParams.get('name'); 
    const topicFromUrl = urlSearchParams.get('topic'); 

    if (!nameFromUrl || !topicFromUrl) {
      console.log("Name or topic not found in the URL");
      return;
    }

    try {
      const studentSnapshot = await firebase.database().ref(`students/${nameFromUrl}`).once('value');
      const studentInfo = studentSnapshot.val();
      const contactSnapshot = await firebase.database().ref(`topics/${topicFromUrl}/students/${nameFromUrl}/numbers/student_phone`).once('value');
      const fatherSnapshot = await firebase.database().ref(`topics/${topicFromUrl}/students/${nameFromUrl}/numbers/father_phone`).once('value');
      const motherSnapshot = await firebase.database().ref(`topics/${topicFromUrl}/students/${nameFromUrl}/numbers/mother_phone`).once('value');

      const contactNumber = contactSnapshot.val();
      const fatherNumber = fatherSnapshot.val();
      const motherNumber = motherSnapshot.val();

      if (studentInfo) {
        document.getElementById("modalStudentName").innerText = nameFromUrl;
        document.getElementById("modalBloodGroup").innerText = studentInfo.bloodGroup || 'N/A';
        document.getElementById("modalContact").innerText = contactNumber || 'N/A';
        document.getElementById("modalFather").innerText = fatherNumber || 'N/A';
        document.getElementById("modalMother").innerText = motherNumber || 'N/A';
        document.getElementById("modalAddress").innerText = studentInfo.address || 'N/A';
        document.getElementById("modalImgUrl").innerText = studentInfo.imageUrl || 'N/A';
        document.getElementById("modalStudentImage").src = studentInfo.imageUrl || 'N/A';

        document.getElementById("infoDisplay").style.display = "block";
      } else {
        alert("Student not found in Firebase");
      }
    } catch (error) {
      console.error("Error fetching data from Firebase:", error);
    }
  }