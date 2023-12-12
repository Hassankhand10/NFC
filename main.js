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
    ChromeSamples.setStatus(
      "Web NFC is not available. Use Chrome on Android."
    );

  var studentName;
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

  document.getElementById("writeButton").addEventListener("click", () => {
    document.getElementById("studentForm").style.display = "block";
    document.getElementById("actionButtons").style.display = "none";
  });

  function submitForm() {
    try {
      const database = firebase.database();
      const studentsRef = database.ref("students");
      const studentNameInput = document.getElementById("studentName");
      studentName = studentNameInput.value;

      if (studentName) {
        studentsRef
          .child(studentName)
          .once("value")
          .then(async (snapshot) => {
            if (snapshot.exists()) {
              const existingData = snapshot.val();
              document.getElementById("actionButtons").style.display =
                "block";
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
              log(
                `User with name '${studentName}' not found in the database.`
              );
            }
          })
          .catch((error) => {
            log("Error checking student name:", error.message);
          });
      } else {
        log("User did not provide a name.");
      }
    } catch (error) {
      log("Argh! " + error);
    }
  }

  async function addAction() {
    const studentName = document.getElementById("studentName").value;
    log(studentName);

    if (!("NDEFReader" in window)) {
      alert("Web NFC is not available. Use Chrome on Android.");
    } else {
      document.getElementById("addModal").style.display = "block";
      try {
        const ndef = new NDEFReader();
        await ndef.scan();
        document.getElementById("addModal").style.display = "none";
        log("> Scan started");

        ndef.addEventListener("readingerror", () => {
          log("Argh! Cannot read data from the NFC tag. Try another one?");
        });

        ndef.addEventListener(
          "reading",
          async ({ message, serialNumber }) => {
            log(`> Serial Number: ${serialNumber}`);

            const database = firebase.database();
            const studentsRef = database.ref("students");

            try {
              const snapshot = await studentsRef
                .child(studentName)
                .once("value");

              if (snapshot.exists()) {
                const existingData = snapshot.val();

                if (
                  !existingData.uniqueNumber &&
                  !existingData.serialNumber
                ) {
                  const uniqueNumber =
                    Date.now() + Math.floor(Math.random() * 1000);
                  const nfcSerialNumber = serialNumber;

                  try {
                    const ndefWrite = new NDEFReader();
                    const encodedStudentName = encodeURIComponent(studentName)
                    log(encodedStudentName)
                      await ndefWrite.write(
                        `Unique Number: ${uniqueNumber}, Student Name: ${studentName}, URL: http://10.171.171.52:4200/coins-history/student/all/${encodedStudentName}/${uniqueNumber}`
                        );
                      
                    log("Message written successfully.");
                    log(
                      `Data updated for student: ${studentName}`
                    );
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
          }
        );
      } catch (error) {
        log("Argh! " + error);
        document.getElementById("addModal").style.display = "none";
      }
    }
  }

  function deleteAction() {
    const studentName = document.getElementById("studentName").value;
    log(studentName);
    document.getElementById("deleteModal").style.display = "block";
  }

  async function deleteConfirmation() {
    const passwordInput = document.getElementById("password");
    const password = passwordInput.value;

    if (password === "password") {
      const studentName = document.getElementById("studentName").value;

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
              log("Student NFC is not register");
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
    } else {
      log("Incorrect password. Delete operation canceled.");
      closeDeleteModal();
    }
  }

  function closeDeleteModal() {
    document.getElementById("deleteModal").style.display = "none";
  }

  function openCricketGround() {
    window.open('cricket-ground.html', '_blank');
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

  makeReadOnlyButton.addEventListener("click", async () => {
    log("User clicked make read-only button");

    try {
      const ndef = new NDEFReader();
      await ndef.makeReadOnly();
      log("> NFC tag has been made permanently read-only");
    } catch (error) {
      log("Argh! " + error);
    }
  });

