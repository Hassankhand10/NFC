document.addEventListener('DOMContentLoaded', async function () {
    try {
        const ndef = new NDEFReader();
        ndef.scan();

        ndef.addEventListener('readingerror', () => {
            alert('Error reading from the NFC tag. Try again.');
        });

        ndef.addEventListener('reading', async ({ message }) => {
            if (message.records.length > 0) {
                const fullMessage = message.records.map(record => new TextDecoder().decode(record.data)).join(', ');
                const studentNameMatch = fullMessage.match(/Student Name: ([^,]+)/);
                const studentName = studentNameMatch ? studentNameMatch[1] : 'Student Name not found';

                const coinsWallet = await getCoinsWalletFromFirebase(studentName);
                const activityCoins = await getCoinsForActivityFromFirebase('Play ground');
                alert(activityCoins)

                if (coinsWallet >= activityCoins) {
                    const previousCoins = coinsWallet;
                    const updatedCoins = previousCoins - activityCoins;
                    await updateCoinsWalletInFirebase(studentName, updatedCoins);

                    alert(`Welcome to ${document.getElementById('activityName').textContent}! You have been charged ${activityCoins} coins.\nPrevious Balance: ${previousCoins} coins\nCurrent Balance: ${updatedCoins} coins`);
                } else {
                    alert(`Sorry, ${studentName}. You don't have enough coins to enter ${document.getElementById('activityName').textContent}. Your current coin balance is ${coinsWallet}.`);
                }

                ndef.stop();
            }
        });

        // Fetch and display the initial activity information on page load
        const initialCoinsRequired = await getCoinsForActivityFromFirebase('Play ground');
        const activityNameElement = document.getElementById('activityName');
        const activityDescriptionElement = document.getElementById('activityDescription');

        activityDescriptionElement.textContent = `${initialCoinsRequired} coins will be deducted`; 

        const coinsInfoElement = document.getElementById('coinsInfo');
        coinsInfoElement.textContent = `Coins needed: ${initialCoinsRequired}`;
    } catch (error) {
        alert('Error setting up NFC reading:', error);
    }
});

async function getCoinsForActivityFromFirebase(activityName) {
    const database = firebase.database();
    const activityCoinsRef = database.ref(`ActivityCoins/${activityName}`);

    try {
        const snapshot = await activityCoinsRef.once('value');
        const coinsForActivity = snapshot.val();

        if (coinsForActivity !== undefined) {
            return coinsForActivity;
        } else {
            console.error(`Coins for activity ${activityName} not found`);
            return 0;
        }
    } catch (error) {
        console.error(`Error fetching coins for activity ${activityName}: ${error.message}`);
        return 0; 
    }
}


async function getCoinsWalletFromFirebase(studentName) {
    const database = firebase.database();
    const studentRef = database.ref(`students/${studentName}`);

    try {
        const snapshot = await studentRef.once('value');
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
        console.error(`Error updating coinsWallet for ${studentName}: ${error.message}`);
    }
}
