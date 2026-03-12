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
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
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
    // TODO: Implement this function
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
    // TODO: Implement this function
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
