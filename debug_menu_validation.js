// Debug script to test menu validation
const { MenuWithLocationSchema } = require('./src/db/data_transfer_objects/types');

const testMenu = {
    name: 'Cafe 3 - GBO - Breakfast',
    location: {
        name: 'Cafe 3',
        description: 'Cafe 3 dining location',
        latitude: 37.8719,
        longitude: -122.2585
    },
    start_time: '2025-08-24T14:24:22.720Z',
    end_time: '2025-08-24T15:24:22.720Z',
    foods: [
        {
            name: 'Plain Bagels',
            brand: 'Cal Dining',
            serving_size: 94.970825,
            serving_units: [{name: "bagel", grams: 95}],
            macro_percentage_error_estimate: 25,
            macro_information_source: 'Nutrition information available at https://dining.berkeley.edu/menus/',
            macros: {
                calories: 250,
                protein: 10,
                fat: 2,
                carbs: 48,
                fiber: 2,
                sugar: 4,
                sodium: 480,
                potassium: 100,
                vitamin_a: 0,
                vitamin_c: 0,
                calcium: 20,
                iron: 2.5,
                magnesium: 25,
                phosphorus: 80,
                zinc: 0.7,
                copper: 0.1,
                manganese: 0.5,
                selenium: 16,
                vitamin_b1: 0.4,
                vitamin_b2: 0.3,
                vitamin_b3: 4.5,
                vitamin_b5: 0.4,
                vitamin_b6: 0.03,
                vitamin_b7: 2,
                vitamin_b9: 80,
                vitamin_b12: 0,
                vitamin_e: 0.3,
                vitamin_k: 1.5
            }
        }
    ]
};

try {
    console.log('Testing MenuWithLocationSchema...');
    const result = MenuWithLocationSchema.parse(testMenu);
    console.log('SUCCESS: MenuWithLocationSchema validation passed');
} catch (error) {
    console.log('FAILED: MenuWithLocationSchema validation failed');
    console.log('Error:', error.message);
    console.log('Details:', JSON.stringify(error.issues, null, 2));
}