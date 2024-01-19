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

if (!("NDEFReader" in window))
  ChromeSamples.setStatus("Web NFC is not available. Use Chrome on Android.");

document.addEventListener("DOMContentLoaded", async function () {
  try {
    await fetchAndDisplayEntryLogs("Cricket Ground");
    const ndef = new NDEFReader();
    ndef.scan();

    ndef.addEventListener("readingerror", () => {
      log("Error reading from the NFC tag. Try again.");
    });

    ndef.addEventListener("reading", async ({ message }) => {
      if (message.records.length > 0) {
        const fullMessage = message.records
          .map((record) => new TextDecoder().decode(record.data))
          .join(", ");
        const studentNameMatch = fullMessage.match(/Student Name: ([^,]+)/);
        const studentName = studentNameMatch
          ? studentNameMatch[1]
          : "Student Name not found";
    
        if (studentName !== "Student Name not found") {
          const coinsWallet = await getCoinsWalletFromFirebase(studentName);
          const activityCoins = await getCoinsForActivityFromFirebase("Cricket Ground");
    
          if (coinsWallet >= activityCoins) {
            const previousCoins = coinsWallet;
            const updatedCoins = previousCoins - activityCoins;
            await updateCoinsWalletInFirebase(studentName, updatedCoins);
            await storeEntryLogInFirebase(studentName, "Cricket Ground");
    
            log(
              `Welcome to ${
                document.getElementById("activityName").textContent
              }! You have been charged ${activityCoins} coins.\nPrevious Balance: ${previousCoins} coins\nCurrent Balance: ${updatedCoins} coins`
            );
          } else {
            log(
              `Sorry, ${studentName}. You don't have enough coins to enter ${
                document.getElementById("activityName").textContent
              }. Your current coin balance is ${coinsWallet}.`
            );
          }
    
          ndef.stop();
        } else {
          log("Student not found in the NFC message.");
        }
      }
    });
    
    const initialCoinsRequired = await getCoinsForActivityFromFirebase(
      "Cricket Ground"
    );
    const activityNameElement = document.getElementById("activityName");
    const activityDescriptionElement = document.getElementById(
      "activityDescription"
    );

    activityDescriptionElement.textContent = `${initialCoinsRequired} coins will be deducted`;

    const coinsInfoElement = document.getElementById("coinsInfo");
    coinsInfoElement.textContent = `Coins needed: ${initialCoinsRequired}`;
    const entryLogsRef = firebase.database().ref('entryLogs/Cricket Ground');
    entryLogsRef.on('value', snapshot => {
        const entryLogs = snapshot.val();
        if (entryLogs) {
            
            fetchAndDisplayEntryLogs("Cricket Ground", entryLogs);
        }
    });
  } catch (error) {
    alert("Error setting up NFC reading:", error);
  }
});

async function fetchAndDisplayEntryLogs(activityName) {
  const entryLogsListElement = document.getElementById("entryLogsList");

  const database = firebase.database();
  const activityLogsRef = database.ref(`entryLogs/${activityName}`);

  try {
    const snapshot = await activityLogsRef.once("value");
    const entryLogs = snapshot.val();

    if (entryLogs) {
        entryLogsListElement.innerHTML = "";
      Object.entries(entryLogs).forEach(([key, log]) => {
        const studentName = log.studentName;
        const entryDate = new Date(log.entryDate).toLocaleString();

        const entryLogItem = `<li>${studentName} charged the card on ${entryDate}</li>`;
        entryLogsListElement.innerHTML += entryLogItem;

        console.log(`Entry Log Item: ${studentName} - ${entryDate}`);
      });
    } else {
      console.log("No Entry Logs Found");
      entryLogsListElement.innerHTML = "<li>No entry logs found.</li>";
    }
  } catch (error) {
    console.error("Error fetching entry logs:", error.message);
  }
}

function storeEntryLogInFirebase(studentName, activityName) {
  const database = firebase.database();
  const entryLogsRef = database.ref(`entryLogs/${activityName}`);

  try {
    const entryLog = {
      studentName: studentName,
      entryDate: new Date().toISOString(),
    };

    entryLogsRef.push(entryLog);
  } catch (error) {
    console.error(`Error storing entry log in Firebase: ${error.message}`);
  }
}
async function getCoinsForActivityFromFirebase(activityName) {
  const database = firebase.database();
  const activityCoinsRef = database.ref(`ActivityCoins/${activityName}`);

  try {
    const snapshot = await activityCoinsRef.once("value");
    const coinsForActivity = snapshot.val();

    if (coinsForActivity !== undefined) {
      return coinsForActivity;
    } else {
      console.error(`Coins for activity ${activityName} not found`);
      return 0;
    }
  } catch (error) {
    console.error(
      `Error fetching coins for activity ${activityName}: ${error.message}`
    );
    return 0;
  }
}

async function getCoinsWalletFromFirebase(studentName) {
  const database = firebase.database();
  const studentRef = database.ref(`students/${studentName}`);

  try {
    const snapshot = await studentRef.once("value");
    const studentData = snapshot.val();

    if (studentData && studentData.coinsWallet !== undefined) {
      return studentData.coinsWallet;
    } else {
      console.error(`Student data or coinsWallet not found for ${studentName}`);
      return 0;
    }
  } catch (error) {
    console.error(`Error fetching student data: ${error.message}`);
    return 0;
  }
}

async function updateCoinsWalletInFirebase(studentName, newCoins) {
  const database = firebase.database();
  const studentRef = database.ref(`students/${studentName}`);

  try {
    await studentRef.update({
      coinsWallet: newCoins,
    });
  } catch (error) {
    console.error(
      `Error updating coinsWallet for ${studentName}: ${error.message}`
    );
  }
}
