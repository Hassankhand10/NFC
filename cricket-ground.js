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

                // Fetch coinsWallet from Firebase Realtime Database
                const coinsWallet = await getCoinsWalletFromFirebase(studentName);

                if (coinsWallet >= 100) {
                    // Deduct 100 coins
                    const previousCoins = coinsWallet;
                    const updatedCoins = previousCoins - 100;
                    // Update coinsWallet in Firebase
                    await updateCoinsWalletInFirebase(studentName, updatedCoins);

                    alert(`Welcome to Cricket Ground, ${studentName}! You have been charged 100 coins.\nPrevious Balance: ${previousCoins} coins\nCurrent Balance: ${updatedCoins} coins`);
                } else {
                    alert(`Sorry, ${studentName}. You don't have enough coins to enter the Cricket Ground. Your current coin balance is ${coinsWallet}.`);
                }

                ndef.stop();
            }
        });
    } catch (error) {
        alert('Error setting up NFC reading:', error);
    }
});

// Function to fetch coinsWallet from Firebase Realtime Database
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
            return 0; // Default value if coinsWallet is not found
        }
    } catch (error) {
        console.error(`Error fetching student data: ${error.message}`);
        return 0; // Default value in case of an error
    }
}

// Function to update coinsWallet in Firebase Realtime Database
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
