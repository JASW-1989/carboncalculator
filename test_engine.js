import { calculateSingleEmission, calculateTotal, calculateAllocation, calculateMassBalance } from './js/calculator.js';

console.log("=== ISO 14067 Engine Verification ===");

let passed = 0;
let total = 0;

function assertEqual(name, actual, expected, tol=0.0001) {
    total++;
    const diff = Math.abs(actual - expected);
    if (diff <= tol) {
        console.log(`✅ [PASS] ${name}`);
        passed++;
    } else {
        console.error(`❌ [FAIL] ${name} | Expected: ${expected}, Got: ${actual}`);
    }
}

// 1. Biogenic Carbon Separation Test
console.log("\n--- 1. Biogenic Carbon Separation ---");
const records = [
    { id: '1', stageId: 's1', activityData: 10, activityUnit: 'kg', emissionFactorValue: 2, emissionFactorUnit: 'kg', carbonType: 'fossil' },
    { id: '2', stageId: 's1', activityData: 5, activityUnit: 'kg', emissionFactorValue: 1.5, emissionFactorUnit: 'kg', carbonType: 'biogenic' }, // emission
    { id: '3', stageId: 's2', activityData: 1, activityUnit: 'kg', emissionFactorValue: -10, emissionFactorUnit: 'kg', carbonType: 'biogenic' }, // removal
    { id: '4', stageId: 's2', activityData: 1, activityUnit: 'kg', emissionFactorValue: 5, emissionFactorUnit: 'kg', carbonType: 'luc' }, // LUC
];

const res1 = calculateTotal(records);
assertEqual("Fossil Total", res1.fossil, 20); // 10 * 2
assertEqual("Biogenic Emission", res1.biogenicEmission, 7.5); // 5 * 1.5
assertEqual("Biogenic Removal", res1.biogenicRemoval, -10); // 1 * -10
assertEqual("LUC", res1.luc, 5); // 1 * 5
assertEqual("Gross Total CO2e", res1.totalCO2e, 22.5); // 20 + 7.5 - 10 + 5

// 2. Co-product Allocation Test
console.log("\n--- 2. Co-product Allocation ---");
const project = {
    allocationMethod: 'mass',
    mainProduct: { mass: 80, value: 100, energy: 0 },
    coProducts: [
        { name: 'C1', mass: 20, value: 50, energy: 0 }
    ]
};
const res2 = calculateAllocation(res1, project);
assertEqual("Allocation Factor (Mass)", res2.factor, 0.8); // 80 / (80+20)
assertEqual("Allocated Fossil", res2.allocatedTotals.fossil, 16); // 20 * 0.8
assertEqual("Allocated Biogenic Emission", res2.allocatedTotals.biogenicEmission, 6); // 7.5 * 0.8
assertEqual("Allocated Total CO2e", res2.allocatedTotals.totalCO2e, 18); // 22.5 * 0.8

// 3. Mass Balance Check
console.log("\n--- 3. Mass Balance Check ---");
const massRecords = [
    { id: 'm1', massValue: 100, isInput: true },
    { id: 'm2', massValue: 20, isInput: true },
    { id: 'm3', massValue: 80, isInput: false },
    { id: 'm4', massValue: 28, isInput: false }, // 120 input, 108 output => diff 12
];
const res3 = calculateMassBalance(massRecords);
assertEqual("Total Input", res3.totalInput, 120);
assertEqual("Total Output", res3.totalOutput, 108);
assertEqual("Mass Diff", res3.diff, 12);
assertEqual("Error Percentage", res3.errorPct, 10); // 12 / 120 * 100

console.log(`\n=== Summary: ${passed}/${total} Tests Passed ===`);
if (passed === total) {
    console.log("🎉 All verification tests passed! The ISO 14067 enhancements are working correctly.");
    process.exit(0);
} else {
    process.exit(1);
}
