/**
 * Personalfragebogen - AQUA-PLUS
 * JavaScript for form functionality
 */

// Personalnummer field reference
const personalnummerField = document.getElementById('personalnummer');

/**
 * Save form data to localStorage
 */
function saveFormData() {
    const form = document.getElementById('personalForm');
    const formData = new FormData(form);
    const data = {};

    // Get all form values
    formData.forEach((value, key) => {
        data[key] = value;
    });

    // Get checkbox states (unchecked ones aren't in FormData)
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        data[cb.name] = cb.checked ? 'ja' : '';
    });

    // Get radio button states
    const radios = form.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        if (radio.checked) {
            data[radio.name] = radio.value;
        }
    });

    localStorage.setItem('personalfragebogen_draft', JSON.stringify(data));

    alert('Entwurf wurde gespeichert!');
}

/**
 * Load form data from localStorage
 */
function loadFormData() {
    const savedData = localStorage.getItem('personalfragebogen_draft');

    if (!savedData) {
        alert('Kein gespeicherter Entwurf gefunden.');
        return;
    }

    const data = JSON.parse(savedData);
    const form = document.getElementById('personalForm');

    Object.keys(data).forEach(key => {
        const elements = form.querySelectorAll(`[name="${key}"]`);

        elements.forEach(element => {
            if (element.type === 'checkbox') {
                element.checked = data[key] === 'ja';
            } else if (element.type === 'radio') {
                element.checked = element.value === data[key];
            } else {
                element.value = data[key] || '';
            }
        });
    });

    alert('Entwurf wurde geladen!');
}

/**
 * Export form data as CSV
 */
function exportCSV() {
    const form = document.getElementById('personalForm');
    const formData = new FormData(form);

    // Build headers and values
    const headers = [];
    const values = [];

    // Collect all input fields
    const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
    const processedNames = new Set();

    inputs.forEach(input => {
        const name = input.name;

        // Skip duplicates
        if (processedNames.has(name)) return;
        processedNames.add(name);

        headers.push(name);

        if (input.type === 'checkbox') {
            values.push(input.checked ? 'Ja' : 'Nein');
        } else if (input.type === 'radio') {
            const checked = form.querySelector(`input[name="${name}"]:checked`);
            values.push(checked ? checked.value : '');
        } else {
            values.push(input.value || '');
        }
    });

    // Create CSV content
    const escapeCSV = (str) => {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const csvContent = headers.map(escapeCSV).join(',') + '\n' + values.map(escapeCSV).join(',');

    // Generate filename with employee name and date
    const familienname = form.querySelector('[name="familienname"]').value || 'Unbekannt';
    const vorname = form.querySelector('[name="vorname"]').value || '';
    const date = new Date().toISOString().split('T')[0];
    const filename = `Personalfragebogen_${familienname}_${vorname}_${date}.csv`;

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Clear the form
 */
function clearForm() {
    if (!confirm('Sind Sie sicher, dass Sie das Formular leeren möchten? Alle Eingaben gehen verloren.')) {
        return;
    }

    const form = document.getElementById('personalForm');

    // Reset all inputs
    const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
    inputs.forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
}

/**
 * Send form to HR via Outlook
 */
function sendToHR() {
    const form = document.getElementById('personalForm');
    const familienname = form.querySelector('[name="familienname"]').value.trim();
    const vorname = form.querySelector('[name="vorname"]').value.trim();
    const eintrittsdatum = form.querySelector('[name="eintrittsdatum"]').value;

    // Validate required fields
    if (!familienname || !vorname) {
        alert('Bitte geben Sie mindestens Familienname und Vorname ein.');
        return;
    }

    // Format entry date for display
    let eintrittDisplay = '';
    if (eintrittsdatum) {
        const date = new Date(eintrittsdatum);
        eintrittDisplay = date.toLocaleDateString('de-DE');
    }

    // Email details
    const recipient = 'sonja.kiemel@aqua-plus.de';
    const subject = `Personalfragebogen - ${vorname} ${familienname}${eintrittDisplay ? ' - Eintritt: ' + eintrittDisplay : ''}`;

    const body = `Sehr geehrte Frau Kiemel,

anbei erhalten Sie den ausgefüllten Personalfragebogen für den neuen Mitarbeiter:

Name: ${vorname} ${familienname}${eintrittDisplay ? '\nEintrittsdatum: ' + eintrittDisplay : ''}

Bitte finden Sie den Fragebogen als PDF im Anhang.

Mit freundlichen Grüßen`;

    // First, prompt user to save as PDF
    const userChoice = confirm(
        'Der Fragebogen wird jetzt verarbeitet:\n\n' +
        '1. Zuerst öffnet sich das Druckfenster - bitte speichern Sie als PDF\n' +
        '2. Danach öffnet sich Outlook mit einer vorbereiteten E-Mail\n' +
        '3. Fügen Sie die gespeicherte PDF-Datei als Anhang hinzu\n\n' +
        'Fortfahren?'
    );

    if (!userChoice) return;

    // Open print dialog for PDF
    window.print();

    // After a short delay, open Outlook
    setTimeout(() => {
        const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }, 1000);
}

/**
 * Auto-save draft every 60 seconds
 */
let autoSaveInterval = setInterval(() => {
    const form = document.getElementById('personalForm');
    const hasData = form.querySelector('[name="familienname"]').value.trim() ||
                    form.querySelector('[name="vorname"]').value.trim();

    if (hasData) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            data[cb.name] = cb.checked ? 'ja' : '';
        });

        localStorage.setItem('personalfragebogen_draft', JSON.stringify(data));
        console.log('Automatisch gespeichert:', new Date().toLocaleTimeString());
    }
}, 60000);

/**
 * Load draft on page load if exists
 */
window.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('personalfragebogen_draft');
    if (savedData) {
        const data = JSON.parse(savedData);
        if (data.familienname || data.vorname) {
            if (confirm('Es wurde ein gespeicherter Entwurf gefunden. Möchten Sie diesen laden?')) {
                loadFormData();
            }
        }
    }
});

/**
 * QR Code Generation
 * Generates QR code with key form data
 */
let qrCodeInstance = null;

function generateQRCode() {
    const form = document.getElementById('personalForm');
    const qrContainer = document.getElementById('qrcode');

    // Get key form data for QR code
    const familienname = form.querySelector('[name="familienname"]').value.trim();
    const vorname = form.querySelector('[name="vorname"]').value.trim();
    const geburtsdatum = form.querySelector('[name="geburtsdatum"]').value;
    const personalnummer = form.querySelector('[name="personalnummer"]').value.trim();
    const eintrittsdatum = form.querySelector('[name="eintrittsdatum"]').value;
    const iban = form.querySelector('[name="iban"]').value.trim();
    const versicherungsnummer = form.querySelector('[name="versicherungsnummer"]').value.trim();

    // Build QR data string
    const qrData = [
        `Name: ${vorname} ${familienname}`,
        personalnummer ? `PersNr: ${personalnummer}` : '',
        geburtsdatum ? `Geb: ${geburtsdatum}` : '',
        eintrittsdatum ? `Eintritt: ${eintrittsdatum}` : '',
        versicherungsnummer ? `SV: ${versicherungsnummer}` : '',
        iban ? `IBAN: ${iban}` : ''
    ].filter(line => line).join('\n');

    // Clear previous QR code
    qrContainer.innerHTML = '';

    // Generate new QR code
    if (typeof QRCode !== 'undefined') {
        qrCodeInstance = new QRCode(qrContainer, {
            text: qrData,
            width: 64,
            height: 64,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });

        // Show the QR code box
        qrContainer.classList.add('visible');
    }
}

// Store original functions
const originalExportCSV = exportCSV;
const originalSendToHR = sendToHR;

// Override sendToHR to generate QR code first
sendToHR = function() {
    const form = document.getElementById('personalForm');
    const familienname = form.querySelector('[name="familienname"]').value.trim();
    const vorname = form.querySelector('[name="vorname"]').value.trim();

    if (!familienname || !vorname) {
        alert('Bitte geben Sie mindestens Familienname und Vorname ein.');
        return;
    }

    generateQRCode();

    // Save to GitHub before sending
    saveToGitHub();

    // Small delay to ensure QR code is rendered before print
    setTimeout(() => {
        originalSendToHR();
    }, 100);
};

/**
 * GitHub Configuration
 */
const GITHUB_CONFIG = {
    username: 'aquaplus2025',
    repo: 'Personalfragebogen',
    token: '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',
    folder: 'data'
};

/**
 * Save form data as CSV to GitHub repository
 */
async function saveToGitHub() {
    const form = document.getElementById('personalForm');
    const familienname = form.querySelector('[name="familienname"]').value.trim();
    const vorname = form.querySelector('[name="vorname"]').value.trim();

    if (!familienname || !vorname) {
        return;
    }

    // Build CSV content
    const headers = [];
    const values = [];
    const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
    const processedNames = new Set();

    inputs.forEach(input => {
        const name = input.name;
        if (processedNames.has(name)) return;
        processedNames.add(name);

        headers.push(name);

        if (input.type === 'checkbox') {
            values.push(input.checked ? 'Ja' : 'Nein');
        } else if (input.type === 'radio') {
            const checked = form.querySelector(`input[name="${name}"]:checked`);
            values.push(checked ? checked.value : '');
        } else {
            values.push(input.value || '');
        }
    });

    const escapeCSV = (str) => {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const csvContent = headers.map(escapeCSV).join(',') + '\n' + values.map(escapeCSV).join(',');

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${GITHUB_CONFIG.folder}/${familienname}_${vorname}_${timestamp}.csv`;

    // Base64 encode the content
    const content = btoa(unescape(encodeURIComponent('\ufeff' + csvContent)));

    // GitHub API endpoint
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/${filename}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Personalfragebogen: ${vorname} ${familienname}`,
                content: content
            })
        });

        if (response.ok) {
            console.log('CSV saved to GitHub:', filename);
        } else {
            const error = await response.json();
            console.error('GitHub save failed:', error.message);
        }
    } catch (err) {
        console.error('GitHub save error:', err);
    }
}

// Also save to GitHub when exporting CSV
const originalExportCSVWithQR = exportCSV;
exportCSV = function() {
    generateQRCode();
    saveToGitHub();
    originalExportCSVWithQR();
};
