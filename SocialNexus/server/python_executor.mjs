import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * TC kimlik numarası doğrulama fonksiyonu
 * 
 * @param {string} tcNo - TC Kimlik numarası
 * @param {string} firstName - Adı
 * @param {string} lastName - Soyadı
 * @param {number|string} yearOfBirth - Doğum yılı
 * @returns {Promise<Object>} - Doğrulama sonucu
 */
export async function validateTCIdentity(tcNo, firstName, lastName, yearOfBirth) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'tc_validator.py'),
      tcNo,
      firstName,
      lastName,
      yearOfBirth.toString()
    ]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Error: ${errorString}`);
        reject(new Error(`TC kimlik doğrulama hatası: ${errorString}`));
        return;
      }

      try {
        // Python'dan dönen son satır JSON verisi olmalı
        const lastLine = dataString.trim().split('\n').pop();
        const result = JSON.parse(lastLine);
        resolve(result);
      } catch (error) {
        reject(new Error(`TC kimlik doğrulama sonucu işlenemedi: ${error.message}`));
      }
    });
  });
}