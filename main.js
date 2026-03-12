const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    function convertToSeconds(time) {

        let parts = time.trim().split(" ");
        let timePart = parts[0];
        let period = parts[1];

        let t = timePart.split(":");

        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);

        if (period === "pm" && h !== 12) {
            h += 12;
        }

        if (period === "am" && h === 12) {
            h = 0;
        }

        return h * 3600 + m * 60 + s;
    }

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let diff = end - start;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    m = String(m).padStart(2, "0");
    s = String(s).padStart(2, "0");

    return `${h}:${m}:${s}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function toSeconds(time) {
        let parts = time.trim().split(" ");
        let timePart = parts[0];
        let period = parts[1];

        let t = timePart.split(":");

        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);

        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    function format(sec) {
        let h = Math.floor(sec / 3600);
        let m = Math.floor((sec % 3600) / 60);
        let s = sec % 60;

        m = String(m).padStart(2, "0");
        s = String(s).padStart(2, "0");

        return `${h}:${m}:${s}`;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let startLimit = 8 * 3600;   // 8:00 AM
    let endLimit = 22 * 3600;    // 10:00 PM

    let idle = 0;

    if (start < startLimit) {
        idle += Math.min(end, startLimit) - start;
    }

    if (end > endLimit) {
        idle += end - Math.max(start, endLimit);
    }

    return format(idle);
}
// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function toSeconds(time) {
        let parts = time.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);

        return h*3600 + m*60 + s;
    }

    function format(sec) {
        let h = Math.floor(sec / 3600);
        let m = Math.floor((sec % 3600) / 60);
        let s = sec % 60;

        m = String(m).padStart(2,"0");
        s = String(s).padStart(2,"0");

        return `${h}:${m}:${s}`;
    }

    let shift = toSeconds(shiftDuration);
    let idle = toSeconds(idleTime);

    let active = shift - idle;

    return format(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSeconds(time) {
        let parts = time.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);

        return h*3600 + m*60 + s;
    }

    let active = toSeconds(activeTime);

    let quota;

    if (date >= "2025-04-10" && date <= "2025-04-30") {
        quota = 6 * 3600;
    } else {
        quota = (8 * 3600) + (24 * 60);
    }

    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    let data = fs.readFileSync(textFile, {encoding: "utf8"});
    let lines = data.trim().split("\n");

    let exists = false;
    let lastIndex = -1;

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        let driverID = parts[0];
        let date = parts[2];

        if (driverID === shiftObj.driverID && date === shiftObj.date) {
            exists = true;
        }

        if (driverID === shiftObj.driverID) {
            lastIndex = i;
        }
    }

    if (exists) {
        return {};
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(shiftObj.date, activeTime);

    let newObj = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quota,
        hasBonus: false
    };

    let newLine = [
        newObj.driverID,
        newObj.driverName,
        newObj.date,
        newObj.startTime,
        newObj.endTime,
        newObj.shiftDuration,
        newObj.idleTime,
        newObj.activeTime,
        newObj.metQuota,
        newObj.hasBonus
    ].join(",");

    if (lastIndex === -1) {
        lines.push(newLine);
    } else {
        lines.splice(lastIndex + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n"));

    return newObj;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    let data = fs.readFileSync(textFile, {encoding: "utf8"});
    let lines = data.trim().split("\n");

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = String(newValue);
            lines[i] = parts.join(",");
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"));
}
// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, {encoding: "utf8"});
    let lines = data.trim().split("\n");

    let count = 0;
    let foundDriver = false;

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        let id = parts[0].trim();
        let date = parts[2].trim();
        let hasBonus = parts[9].trim();

        if (id === driverID) {

            foundDriver = true;

            let recordMonth = parseInt(date.split("-")[1]);

            if (recordMonth === parseInt(month) && hasBonus === "true") {
                count++;
            }
        }
    }

    if (!foundDriver) {
        return -1;
    }

    return count;
}
// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, {encoding: "utf8"});
    let lines = data.trim().split("\n");

    let totalSeconds = 0;

    function toSeconds(time) {
        let parts = time.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        return h*3600 + m*60 + s;
    }

    function format(sec) {
        let h = Math.floor(sec/3600);
        let m = Math.floor((sec%3600)/60);
        let s = sec%60;

        m = String(m).padStart(2,"0");
        s = String(s).padStart(2,"0");

        return `${h}:${m}:${s}`;
    }

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        let id = parts[0].trim();
        let date = parts[2].trim();
        let activeTime = parts[7].trim();

        let recordMonth = parseInt(date.split("-")[1]);

        if (id === driverID && recordMonth === month) {
            totalSeconds += toSeconds(activeTime);
        }
    }

    return format(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    let data = fs.readFileSync(textFile, {encoding: "utf8"});
    let lines = data.trim().split("\n");

    let rateData = fs.readFileSync(rateFile, {encoding: "utf8"});
    let rateLines = rateData.trim().split("\n");

    let dayOff = "";

    // find driver dayOff from rate file
    for (let i = 0; i < rateLines.length; i++) {
        let parts = rateLines[i].split(",");
        if (parts[0].trim() === driverID) {
            dayOff = parts[1].trim();
        }
    }

    let totalSeconds = 0;

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        let id = parts[0].trim();
        let date = parts[2].trim();

        if (id !== driverID) continue;

        let dateParts = date.split("-");
        let recordMonth = parseInt(dateParts[1]);
        let recordDate = new Date(date);
        let weekday = recordDate.toLocaleDateString("en-US",{weekday:"long"});

        if (recordMonth !== month) continue;

        // skip day off
        if (weekday === dayOff) continue;

        // check Eid period
        let quotaSeconds;
        if (date >= "2025-04-10" && date <= "2025-04-30") {
            quotaSeconds = 6 * 3600;
        } else {
            quotaSeconds = (8 * 3600) + (24 * 60);
        }

        totalSeconds += quotaSeconds;
    }

    // subtract bonus reduction
    totalSeconds -= bonusCount * 2 * 3600;

    let h = Math.floor(totalSeconds/3600);
    let m = Math.floor((totalSeconds%3600)/60);
    let s = totalSeconds%60;

    m = String(m).padStart(2,"0");
    s = String(s).padStart(2,"0");

    return `${h}:${m}:${s}`;
}
// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    function toSeconds(time) {
        let parts = time.split(":");
        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);
        return h*3600 + m*60 + s;
    }

    let actual = toSeconds(actualHours);
    let required = toSeconds(requiredHours);

    let rateData = fs.readFileSync(rateFile, {encoding:"utf8"});
    let lines = rateData.trim().split("\n");

    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");
        if (parts[0].trim() === driverID) {
            basePay = parseInt(parts[2]);
            tier = parseInt(parts[3]);
        }
    }

    let allowedMissing = 0;

    if (tier === 1) allowedMissing = 50;
    if (tier === 2) allowedMissing = 20;
    if (tier === 3) allowedMissing = 10;
    if (tier === 4) allowedMissing = 3;

    let missingSeconds = required - actual;

    if (missingSeconds <= 0) {
        return basePay;
    }

    let missingHours = Math.floor(missingSeconds / 3600);

    if (missingHours <= allowedMissing) {
        return basePay;
    }

    let billableMissing = missingHours - allowedMissing;

    let deductionRatePerHour = Math.floor(basePay / 185);

    let salaryDeduction = billableMissing * deductionRatePerHour;

    return basePay - salaryDeduction;
}
module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
