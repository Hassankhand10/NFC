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

                if (coinsWallet >= 100) {
                    const previousCoins = coinsWallet;
                    const updatedCoins = previousCoins - 100;
                    await updateCoinsWalletInFirebase(studentName, updatedCoins);

                    alert(`Welcome to Big Slide, ${studentName}! You have been charged 100 coins.\nPrevious Balance: ${previousCoins} coins\nCurrent Balance: ${updatedCoins} coins`);
                } else {
                    alert(`Sorry, ${studentName}. You don't have enough coins to enter the Big Slide. Your current coin balance is ${coinsWallet}.`);
                }

                ndef.stop();
            }
        });
    } catch (error) {
        alert('Error setting up NFC reading:', error);
    }
});

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
