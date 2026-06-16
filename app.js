let ratesData = null;

const destinationSelect = document.getElementById("destination");
const calculateBtn = document.getElementById("calculateBtn");
const daysInput = document.getElementById("days");

const dailyDeductionsContainer = document.getElementById("dailyDeductions");
const clearDeductionsBtn = document.getElementById("clearDeductions");

const tripTotalElement = document.getElementById("tripTotal");
const dailyRateElement = document.getElementById("dailyRate");
const baseDailyRateElement = document.getElementById("baseDailyRate");
const totalDeductionsElement = document.getElementById("totalDeductions");
const daysCalculatedElement = document.getElementById("daysCalculated");

async function loadRates() {
    try {
        const response = await fetch("rates.json");
        ratesData = await response.json();

        populateDestinations();
        generateDailyDeductions();
        calculateAllowance();

    } catch (error) {
        console.error(error);
        alert("Error al cargar rates.json.");
    }
}

function populateDestinations() {
    ratesData.destinations.forEach(destination => {
        const option = document.createElement("option");
        option.value = destination.id;
        option.textContent = destination.name;
        destinationSelect.appendChild(option);
    });
}

function getSelectedValue(name) {
    return document.querySelector(`input[name="${name}"]:checked`).value;
}

function getCurrentDestination() {
    return ratesData.destinations.find(destination => destination.id === destinationSelect.value);
}

function getBaseDailyRate() {
    const destination = getCurrentDestination();

    if (!destination) return 0;

    const duration = getSelectedValue("duration");
    const currency = getSelectedValue("currency");

    return destination.rates[duration][currency];
}

function getAdjustedPercentages() {
    const destination = getCurrentDestination();

    if (!destination) return null;

    const standard = ratesData.standardPercentages;
    const lodgingPercentage = destination.lodgingPercentage;

    const nonLodgingTotal =
        standard.breakfast +
        standard.lunch +
        standard.dinner +
        standard.incidentals;

    const remainingPercentage = 100 - lodgingPercentage;
    const scaleFactor = remainingPercentage / nonLodgingTotal;

    return {
        lodging: lodgingPercentage,
        breakfast: standard.breakfast * scaleFactor,
        lunch: standard.lunch * scaleFactor,
        dinner: standard.dinner * scaleFactor,
        incidentals: standard.incidentals * scaleFactor
    };
}

function formatCurrency(value) {
    const currency = getSelectedValue("currency");
    const locale = currency === "usd" ? "en-US" : "es-HN";
    const code = currency === "usd" ? "USD" : "HNL";

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2
    }).format(value);
}

function generateDailyDeductions() {
    const nights = Number(daysInput.value);

    dailyDeductionsContainer.innerHTML = "";

    if (nights === 0) {
        dailyDeductionsContainer.innerHTML = `
            <div class="day-row">
                <div class="day-header">
                    <div class="day-title">Viaje ida y vuelta el mismo día</div>
                    <div class="day-total" id="dayTotal-1">--</div>
                </div>
                <p class="field-note">
                    Se aplica automáticamente el 40% de la tarifa diaria del destino seleccionado.
                </p>
            </div>
        `;
        return;
    }

    if (!nights || nights < 0) return;

    for (let day = 1; day <= nights; day++) {
        const row = document.createElement("div");
        row.className = "day-row";

        row.innerHTML = `
            <div class="day-header">
                <div class="day-title">Noche ${day}</div>
                <div class="day-total" id="dayTotal-${day}">--</div>
            </div>

            <div class="day-options">

                <label>
                    <input type="checkbox" data-day="${day}" data-type="lodging">
                    <span>Hospedaje</span>
                </label>

                <label>
                    <input type="checkbox" data-day="${day}" data-type="breakfast">
                    <span>Desayuno</span>
                </label>

                <label>
                    <input type="checkbox" data-day="${day}" data-type="lunch">
                    <span>Almuerzo</span>
                </label>

                <label>
                    <input type="checkbox" data-day="${day}" data-type="dinner">
                    <span>Cena</span>
                </label>

                <label>
                    <input type="checkbox" data-day="${day}" data-type="incidentals">
                    <span>Incidentales</span>
                </label>

            </div>
        `;

        dailyDeductionsContainer.appendChild(row);
    }

    addDailyCheckboxListeners();
}

function addDailyCheckboxListeners() {
    document.querySelectorAll("#dailyDeductions input[type='checkbox']").forEach(checkbox => {
        checkbox.addEventListener("change", calculateAllowance);
    });
}

function calculateAllowance() {
    const destination = getCurrentDestination();
    const nights = Number(daysInput.value);

    if (!destination || nights < 0) {
        resetResults();
        return;
    }

    const baseDailyRate = getBaseDailyRate();
    const adjustedPercentages = getAdjustedPercentages();

    let tripTotal = 0;
    let totalDeductions = 0;

    if (nights === 0) {
        tripTotal = baseDailyRate * 0.40;

        tripTotalElement.textContent = formatCurrency(tripTotal);
        dailyRateElement.textContent = formatCurrency(tripTotal);
        baseDailyRateElement.textContent = formatCurrency(baseDailyRate);
        totalDeductionsElement.textContent = formatCurrency(baseDailyRate - tripTotal);
        daysCalculatedElement.textContent = "Viaje mismo día";

        const dayTotal = document.getElementById("dayTotal-1");
        if (dayTotal) dayTotal.textContent = formatCurrency(tripTotal);

        return;
    }

    for (let day = 1; day <= nights; day++) {
        let dailyPayable = baseDailyRate;
        let dailyDeductions = 0;

        const checkedItems = document.querySelectorAll(`input[data-day="${day}"]:checked`);

        checkedItems.forEach(item => {
            const type = item.dataset.type;
            const percentage = adjustedPercentages[type];
            const amount = baseDailyRate * (percentage / 100);

            dailyDeductions += amount;
            dailyPayable -= amount;
        });

        tripTotal += dailyPayable;
        totalDeductions += dailyDeductions;

        const dayTotal = document.getElementById(`dayTotal-${day}`);
        if (dayTotal) dayTotal.textContent = formatCurrency(dailyPayable);
    }

    tripTotalElement.textContent = formatCurrency(tripTotal);
    dailyRateElement.textContent = formatCurrency(tripTotal / nights);
    baseDailyRateElement.textContent = formatCurrency(baseDailyRate);
    totalDeductionsElement.textContent = formatCurrency(totalDeductions);
    daysCalculatedElement.textContent = String(nights);
}

function resetResults() {
    tripTotalElement.textContent = "--";
    dailyRateElement.textContent = "--";
    baseDailyRateElement.textContent = "--";
    totalDeductionsElement.textContent = "--";
    daysCalculatedElement.textContent = "--";
}

function applyDeductionToAll(type) {
    document.querySelectorAll(`input[data-type="${type}"]`).forEach(checkbox => {
        checkbox.checked = true;
    });

    calculateAllowance();
}

function clearAllDeductions() {
    document.querySelectorAll("#dailyDeductions input[type='checkbox']").forEach(checkbox => {
        checkbox.checked = false;
    });

    calculateAllowance();
}

daysInput.addEventListener("input", () => {
    generateDailyDeductions();
    calculateAllowance();
});

destinationSelect.addEventListener("change", calculateAllowance);

document.querySelectorAll("input[name='duration']").forEach(input => {
    input.addEventListener("change", calculateAllowance);
});

document.querySelectorAll("input[name='currency']").forEach(input => {
    input.addEventListener("change", calculateAllowance);
});

document.querySelectorAll("[data-apply]").forEach(button => {
    button.addEventListener("click", () => {
        applyDeductionToAll(button.dataset.apply);
    });
});

clearDeductionsBtn.addEventListener("click", clearAllDeductions);
calculateBtn.addEventListener("click", calculateAllowance);

loadRates();