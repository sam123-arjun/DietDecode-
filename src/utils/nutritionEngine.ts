import { UserProfile, NutritionEngineOutput, MealItem, DietPlan, DietPlanDay, DietPlanMeal } from '../types';

/**
 * Deterministic Nutrition Recommendation Engine for DietDecode Prototype.
 * Calculates BMR via Mifflin-St Jeor, TDEE, macronutrient grams,
 * and generates meal plans tailored to dietary preferences, allergies, and health goals.
 */
export function calculatePersonalizedDiet(profile: Partial<UserProfile>): NutritionEngineOutput {
  const age = profile.age || 21;
  const gender = profile.gender || 'male';
  const height = profile.height || 172; // cm
  const weight = profile.weight || 68; // kg
  const activityLevel = profile.activityLevel || 'moderate';
  const dietType = profile.dietType || 'vegetarian';
  const healthGoals = profile.healthGoals || ['balanced_nutrition'];
  const allergies = (profile.allergies || []).map((a) => a.toLowerCase().trim());

  // 1. Mifflin-St Jeor BMR Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 78;
  }

  // 2. Activity Multiplier -> TDEE (Total Daily Energy Expenditure)
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.4;
  const tdee = Math.round(bmr * multiplier);

  // 3. Goal Calorie Adjustment
  let goalAdjustment = 1.0;
  if (healthGoals.includes('weight_loss')) {
    goalAdjustment = 0.85; // 15% deficit
  } else if (healthGoals.includes('muscle_gain') || healthGoals.includes('weight_gain')) {
    goalAdjustment = 1.12; // 12% surplus
  } else {
    goalAdjustment = 1.0;
  }
  const targetCalories = Math.round(tdee * goalAdjustment);

  // 4. Macronutrient grams:
  // Protein: 2.0g/kg for muscle gain, 1.6g/kg for weight loss, 1.4g/kg balanced
  let proteinFactor = 1.4;
  if (healthGoals.includes('muscle_gain')) proteinFactor = 2.0;
  else if (healthGoals.includes('weight_loss')) proteinFactor = 1.7;

  const proteinGrams = Math.round(weight * proteinFactor);
  const proteinCalories = proteinGrams * 4;

  // Fats: 25% of total calories
  const fatsCalories = Math.round(targetCalories * 0.25);
  const fatsGrams = Math.round(fatsCalories / 9);

  // Carbs: Remaining calories
  const carbsCalories = Math.max(targetCalories - proteinCalories - fatsCalories, 400);
  const carbsGrams = Math.round(carbsCalories / 4);

  // 5. Water: approx 35ml per kg + activity bonus
  const waterLiters = Number(((weight * 35 + (activityLevel === 'very_active' ? 700 : 350)) / 1000).toFixed(1));

  // 6. Food item selection based on dietType and allergies
  const filterAllergens = (items: string[]): string[] => {
    return items.filter((item) => {
      const lower = item.toLowerCase();
      return !allergies.some((allergy) => allergy && lower.includes(allergy));
    });
  };

  let breakfastItems: string[];
  let lunchItems: string[];
  let snackItems: string[];
  let dinnerItems: string[];

  if (dietType === 'vegan') {
    breakfastItems = filterAllergens(['Steel Cut Oatmeal', 'Almond Milk', 'Chia Seeds', 'Sliced Bananas', 'Walnuts']);
    lunchItems = filterAllergens(['Brown Rice', 'Lentil Dal', 'Steamed Broccoli', 'Spiced Chickpeas', 'Cucumber Salad']);
    snackItems = filterAllergens(['Green Apple', 'Pumpkin Seeds', 'Roasted Makhana (Foxnuts)', 'Green Tea']);
    dinnerItems = filterAllergens(['Tofu Stir Fry', 'Quinoa', 'Mixed Bell Peppers', 'Spinach Soup', 'Avocado Slice']);
  } else if (dietType === 'non-vegetarian') {
    breakfastItems = filterAllergens(['3 Boiled Egg Whites + 1 Whole Egg', 'Whole Wheat Toast', 'Avocado', 'Fresh Orange Juice']);
    lunchItems = filterAllergens(['Grilled Chicken Breast / Fish', 'Steamed Basmati Rice', 'Yellow Dal Tadka', 'Greens Salad']);
    snackItems = filterAllergens(['Greek Yogurt', 'Handful of Almonds', 'Blueberries', 'Whey Shake']);
    dinnerItems = filterAllergens(['Baked Salmon / Herb Chicken', 'Roasted Sweet Potato', 'Sautéed Asparagus', 'Lemon Soup']);
  } else {
    // Default Vegetarian
    breakfastItems = filterAllergens(['Rolled Oatmeal', 'Skimmed Milk / Soy Milk', 'Banana', 'Chopped Walnuts & Raisins']);
    lunchItems = filterAllergens(['Steamed Rice / Phulka Roti', 'Moong Dal Tadka', 'Seasonal Subzi', 'Curd (Yogurt)', 'Kachumber Salad']);
    snackItems = filterAllergens(['Roasted Makhana', 'Almonds & Cashews', 'Fresh Seasonal Fruit (Apple/Papaya)', 'Spiced Green Tea']);
    dinnerItems = filterAllergens(['Whole Wheat Roti (2 pcs)', 'Paneer Bhurji / Palak Paneer', 'Mixed Vegetable Curry', 'Warm Turmeric Soup']);
  }

  const recommendedMeals: Omit<MealItem, 'id' | 'userId'>[] = [
    {
      name: 'Breakfast',
      scheduledTime: '08:00',
      items: breakfastItems,
      calories: Math.round(targetCalories * 0.25),
      protein: Math.round(proteinGrams * 0.25),
      carbs: Math.round(carbsGrams * 0.30),
      fats: Math.round(fatsGrams * 0.20),
      waterMl: 400,
      recommendationNotes: 'Energizing start rich in fiber and sustained-release complex carbohydrates.',
      reminderEnabled: true,
      order: 1,
    },
    {
      name: 'Lunch',
      scheduledTime: '13:00',
      items: lunchItems,
      calories: Math.round(targetCalories * 0.40),
      protein: Math.round(proteinGrams * 0.40),
      carbs: Math.round(carbsGrams * 0.45),
      fats: Math.round(fatsGrams * 0.35),
      waterMl: 600,
      recommendationNotes: 'Core fueling meal providing balanced macro ratio and complete proteins.',
      reminderEnabled: true,
      order: 2,
    },
    {
      name: 'Snack',
      scheduledTime: '17:00',
      items: snackItems,
      calories: Math.round(targetCalories * 0.12),
      protein: Math.round(proteinGrams * 0.10),
      carbs: Math.round(carbsGrams * 0.10),
      fats: Math.round(fatsGrams * 0.20),
      waterMl: 300,
      recommendationNotes: 'Prevents late-afternoon blood sugar dips and curbs dinner overeating.',
      reminderEnabled: true,
      order: 3,
    },
    {
      name: 'Dinner',
      scheduledTime: '20:00',
      items: dinnerItems,
      calories: Math.round(targetCalories * 0.23),
      protein: Math.round(proteinGrams * 0.25),
      carbs: Math.round(carbsGrams * 0.15),
      fats: Math.round(fatsGrams * 0.25),
      waterMl: 400,
      recommendationNotes: 'Lean, light-digestive dinner optimized for overnight recovery and sleep quality.',
      reminderEnabled: true,
      order: 4,
    },
  ];

  const rationale = [
    `BMR calculated at ${bmr} kcal/day using the Mifflin-St Jeor formula based on age (${age}), gender (${gender}), and physical metrics.`,
    `TDEE evaluated at ${tdee} kcal/day applying the ${activityLevel} physical activity multiplier.`,
    `Target caloric intake set to ${targetCalories} kcal/day aligned with your primary goal: ${healthGoals.join(', ').replace(/_/g, ' ')}.`,
    `Macronutrients optimized for ${dietType} diet: ${proteinGrams}g Protein (${Math.round((proteinCalories/targetCalories)*100)}%), ${carbsGrams}g Carbohydrates, and ${fatsGrams}g Fats.`,
    `Daily hydration target calculated at ${waterLiters} Liters/day.`,
  ];

  return {
    bmr,
    tdee,
    targetCalories,
    macroSplit: {
      proteinGrams,
      carbsGrams,
      fatsGrams,
    },
    waterLiters,
    recommendedMeals,
    rationale,
  };
}

// ---------------------------------------------------------------------------
// 7-Day Plan Generator
// ---------------------------------------------------------------------------

/** Per-day meal item rotation pools (7 variations, cycling if needed) */
const MEAL_ROTATIONS: Record<string, Record<string, string[][]>> = {
  vegetarian: {
    breakfast: [
      ['Rolled Oatmeal', 'Skimmed Milk', 'Banana', 'Chopped Walnuts & Raisins'],
      ['Moong Dal Cheela (2 pcs)', 'Mint Chutney', 'Masala Chai', 'Papaya Slices'],
      ['Whole Wheat Upma', 'Roasted Peanuts', 'Mixed Veg Raita', 'Green Tea'],
      ['Multigrain Toast (2 slices)', 'Peanut Butter', 'Banana', 'Low-fat Milk'],
      ['Poha with Veggies & Lemon', 'Curd', 'Green Tea', 'Almonds (10)'],
      ['Idli (3 pcs)', 'Sambar', 'Coconut Chutney', 'Masala Chai'],
      ['Greek Yogurt Parfait', 'Granola', 'Berries / Seasonal Fruit', 'Green Tea'],
    ],
    lunch: [
      ['Steamed Rice / Phulka Roti', 'Moong Dal Tadka', 'Seasonal Subzi', 'Curd', 'Kachumber Salad'],
      ['Rajma Chawal', 'Steamed Broccoli', 'Cucumber Raita', 'Slice of Lemon'],
      ['Brown Rice', 'Chana Masala', 'Mixed Greens Salad', 'Buttermilk'],
      ['2 Whole Wheat Rotis', 'Palak Paneer', 'Seasonal Sabzi', 'Dal Soup'],
      ['Quinoa Pulao', 'Mixed Vegetables', 'Roasted Chickpeas', 'Mint Raita'],
      ['Vegetable Biryani (Brown Rice)', 'Boondi Raita', 'Papad', 'Salad'],
      ['Dal Khichdi', 'Ghee (1 tsp)', 'Roasted Pappad', 'Salad'],
    ],
    snack: [
      ['Roasted Makhana', 'Almonds & Cashews', 'Fresh Fruit (Apple/Papaya)', 'Spiced Green Tea'],
      ['Greek Yogurt (plain)', 'Mixed Seeds', 'Berries', 'Herbal Tea'],
      ['Sprouted Moong Chaat', 'Lemon Juice', 'Cucumber Sticks', 'Buttermilk'],
      ['Whole Wheat Crackers', 'Hummus', 'Carrot Sticks', 'Green Tea'],
      ['Banana with Almond Butter', 'Pumpkin Seeds', 'Green Tea'],
      ['Roasted Chana & Peanuts', 'Seasonal Fruit', 'Lemon Water'],
      ['Makhana Chaat', 'Dry Fruits', 'Masala Chai (low sugar)'],
    ],
    dinner: [
      ['Whole Wheat Roti (2 pcs)', 'Paneer Bhurji / Palak Paneer', 'Mixed Veg Curry', 'Warm Turmeric Soup'],
      ['Brown Rice', 'Rajma Masala (light)', 'Steamed Spinach', 'Cucumber Slices'],
      ['2 Rotis', 'Tofu & Vegetable Stir Fry', 'Dal Soup', 'Salad'],
      ['Daliya (Broken Wheat Porridge)', 'Roasted Vegetables', 'Mint Raita'],
      ['2 Rotis', 'Mushroom Masala', 'Steamed Broccoli', 'Light Dal'],
      ['Paneer Tikka (grilled)', 'Mixed Salad', 'Mint Chutney', 'Soup'],
      ['Vegetable Khichdi', 'Low-fat Curd', 'Roasted Papad', 'Salad'],
    ],
  },
  vegan: {
    breakfast: [
      ['Steel Cut Oatmeal', 'Almond Milk', 'Chia Seeds', 'Sliced Bananas', 'Walnuts'],
      ['Tofu Scramble', 'Whole Grain Toast', 'Sautéed Spinach', 'Green Tea'],
      ['Smoothie Bowl', 'Frozen Berries', 'Oats', 'Coconut Flakes', 'Pumpkin Seeds'],
      ['Overnight Oats (Almond Milk)', 'Chia Seeds', 'Mixed Berries'],
      ['Avocado Toast (Multigrain)', 'Tomato Slices', 'Black Pepper', 'Green Tea'],
      ['Mango Smoothie (Oat Milk)', 'Granola', 'Flax Seeds'],
      ['Banana Oat Pancakes (3)', 'Maple Syrup', 'Mixed Fruit'],
    ],
    lunch: [
      ['Brown Rice', 'Lentil Dal', 'Steamed Broccoli', 'Spiced Chickpeas', 'Cucumber Salad'],
      ['Chickpea Buddha Bowl', 'Quinoa', 'Roasted Vegetables', 'Tahini Dressing'],
      ['Tofu Stir Fry', 'Soba Noodles', 'Edamame', 'Ginger-Soy Sauce'],
      ['Vegetable Biryani (Vegan)', 'Raita (Coconut Yogurt)', 'Salad'],
      ['Lentil Soup', 'Whole Grain Bread', 'Avocado Salad'],
      ['Black Bean Tacos (Corn Tortilla)', 'Salsa', 'Guacamole', 'Shredded Cabbage'],
      ['Dal Makhani (Vegan)', 'Brown Rice', 'Roasted Asparagus', 'Salad'],
    ],
    snack: [
      ['Green Apple', 'Pumpkin Seeds', 'Roasted Makhana', 'Green Tea'],
      ['Energy Balls (Dates, Oats, Nut Butter)', 'Green Tea'],
      ['Fruit Salad', 'Chia Pudding (Coconut Milk)'],
      ['Roasted Chickpeas', 'Mixed Seeds', 'Herbal Tea'],
      ['Almond Butter on Rice Cakes', 'Banana'],
      ['Trail Mix (Nuts, Seeds, Dried Fruit)', 'Herbal Tea'],
      ['Smoothie (Spinach, Banana, Almond Milk, Chia)'],
    ],
    dinner: [
      ['Tofu Stir Fry', 'Quinoa', 'Mixed Bell Peppers', 'Spinach Soup', 'Avocado Slice'],
      ['Lentil Curry', 'Brown Rice', 'Roasted Sweet Potato', 'Salad'],
      ['Chickpea Tikka (Grilled)', 'Mint Chutney', 'Vegetable Soup', 'Salad'],
      ['Spaghetti (Whole Wheat)', 'Tomato-Basil Sauce', 'Steamed Greens', 'Salad'],
      ['Thai Green Curry (Tofu)', 'Jasmine Rice', 'Bok Choy'],
      ['Vegetable Dhal', 'Whole Grain Roti', 'Roasted Zucchini', 'Salad'],
      ['Stuffed Bell Peppers (Rice & Beans)', 'Salsa', 'Mixed Greens'],
    ],
  },
  'non-vegetarian': {
    breakfast: [
      ['3 Boiled Egg Whites + 1 Whole Egg', 'Whole Wheat Toast', 'Avocado', 'Fresh Orange Juice'],
      ['Omelette (2 Eggs)', 'Sautéed Mushrooms', 'Multigrain Toast', 'Green Tea'],
      ['Overnight Oats', 'Protein Powder (Whey)', 'Banana', 'Almond Milk'],
      ['Smoked Salmon', 'Whole Grain Bagel', 'Cream Cheese', 'Cucumber Slices'],
      ['Scrambled Eggs (2)', 'Turkey Slices', 'Whole Wheat Toast', 'OJ'],
      ['Egg Bhurji', 'Multigrain Roti (1)', 'Mixed Sprouts', 'Masala Chai'],
      ['Greek Yogurt Parfait', 'Granola', 'Mixed Berries', 'Honey'],
    ],
    lunch: [
      ['Grilled Chicken Breast', 'Steamed Basmati Rice', 'Yellow Dal Tadka', 'Greens Salad'],
      ['Tuna Salad Wrap', 'Whole Wheat Tortilla', 'Lettuce', 'Tomato', 'Lemon Dressing'],
      ['Chicken Biryani (Light)', 'Raita', 'Salad', 'Buttermilk'],
      ['Baked Fish (Tilapia)', 'Quinoa', 'Steamed Asparagus', 'Lemon Wedge'],
      ['Chicken Stir Fry', 'Brown Rice', 'Mixed Vegetables', 'Soy-Ginger Sauce'],
      ['Egg Curry (2 Eggs)', 'Roti (2)', 'Dal Soup', 'Salad'],
      ['Grilled Shrimp', 'Brown Rice', 'Roasted Broccoli', 'Garlic Butter (light)'],
    ],
    snack: [
      ['Greek Yogurt', 'Handful of Almonds', 'Blueberries', 'Whey Shake'],
      ['Hard-Boiled Egg (1)', 'Whole Grain Crackers', 'Hummus'],
      ['Chicken Jerky', 'Mixed Nuts', 'Green Tea'],
      ['Cottage Cheese', 'Fruit Slices', 'Seeds', 'Herbal Tea'],
      ['Tuna on Whole Grain Crackers', 'Cucumber Sticks'],
      ['Protein Bar (natural)', 'Green Tea', 'Almonds'],
      ['Boiled Egg (1)', 'Apple', 'Herbal Tea'],
    ],
    dinner: [
      ['Baked Salmon / Herb Chicken', 'Roasted Sweet Potato', 'Sautéed Asparagus', 'Lemon Soup'],
      ['Grilled Chicken Thigh', 'Whole Wheat Roti (1)', 'Sautéed Spinach', 'Soup'],
      ['Fish Curry (light)', 'Brown Rice', 'Steamed Broccoli', 'Salad'],
      ['Turkey Meatballs', 'Zucchini Noodles', 'Tomato Sauce', 'Salad'],
      ['Egg Bhurji (2 eggs)', 'Dal (light)', 'Whole Wheat Roti', 'Salad'],
      ['Chicken Soup', 'Whole Grain Bread', 'Sautéed Greens'],
      ['Baked Tilapia', 'Quinoa', 'Roasted Bell Peppers', 'Lemon Vinaigrette Salad'],
    ],
  },
};

function getRotation(dietType: string): Record<string, string[][]> {
  if (dietType === 'vegan') return MEAL_ROTATIONS.vegan;
  if (dietType === 'non-vegetarian' || dietType === 'non_vegetarian') return MEAL_ROTATIONS['non-vegetarian'];
  return MEAL_ROTATIONS.vegetarian;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function getWeekLabel(): string {
  return `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/**
 * Generates a 7-day DietPlan from a user profile.
 * Nutritionally calculated via calculatePersonalizedDiet(); meals are deterministically varied per day.
 */
export function generate7DayPlan(profile: Partial<UserProfile>, userId: string): DietPlan {
  const stats = calculatePersonalizedDiet(profile);
  const { targetCalories, macroSplit, waterLiters } = stats;
  const { proteinGrams: targetProtein, carbsGrams: targetCarbs, fatsGrams: targetFats } = macroSplit;

  const dietType = profile.dietType || 'vegetarian';
  const rotation = getRotation(dietType);
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const days: DietPlanDay[] = Array.from({ length: 7 }, (_, dayIndex): DietPlanDay => {
    const date = dayIndex === 0 ? todayStr : addDays(todayStr, dayIndex);
    const idx = dayIndex % 7;

    const meals: DietPlanMeal[] = [
      {
        id: `pm_${userId}_d${dayIndex}_breakfast`,
        mealType: 'breakfast',
        name: 'Breakfast',
        scheduledTime: '08:00',
        items: rotation.breakfast[idx] ?? rotation.breakfast[0],
        calories: Math.round(targetCalories * 0.25),
        protein: Math.round(targetProtein * 0.25),
        carbs: Math.round(targetCarbs * 0.30),
        fats: Math.round(targetFats * 0.20),
        portionNote: 'Energizing start — rich in fiber and complex carbohydrates.',
        reminderEnabled: true,
      },
      {
        id: `pm_${userId}_d${dayIndex}_lunch`,
        mealType: 'lunch',
        name: 'Lunch',
        scheduledTime: '13:00',
        items: rotation.lunch[idx] ?? rotation.lunch[0],
        calories: Math.round(targetCalories * 0.40),
        protein: Math.round(targetProtein * 0.40),
        carbs: Math.round(targetCarbs * 0.45),
        fats: Math.round(targetFats * 0.35),
        portionNote: 'Core fueling meal — balanced macros and complete proteins.',
        reminderEnabled: true,
      },
      {
        id: `pm_${userId}_d${dayIndex}_snack`,
        mealType: 'snack',
        name: 'Snack',
        scheduledTime: '17:00',
        items: rotation.snack[idx] ?? rotation.snack[0],
        calories: Math.round(targetCalories * 0.12),
        protein: Math.round(targetProtein * 0.10),
        carbs: Math.round(targetCarbs * 0.10),
        fats: Math.round(targetFats * 0.20),
        portionNote: 'Prevents late-afternoon energy dips.',
        reminderEnabled: true,
      },
      {
        id: `pm_${userId}_d${dayIndex}_dinner`,
        mealType: 'dinner',
        name: 'Dinner',
        scheduledTime: '20:00',
        items: rotation.dinner[idx] ?? rotation.dinner[0],
        calories: Math.round(targetCalories * 0.23),
        protein: Math.round(targetProtein * 0.25),
        carbs: Math.round(targetCarbs * 0.15),
        fats: Math.round(targetFats * 0.25),
        portionNote: 'Lean, light-digestive dinner for overnight recovery.',
        reminderEnabled: true,
      },
    ];

    return { dayIndex, date, meals };
  });

  return {
    id: `plan_${userId}_${Date.now()}`,
    userId,
    name: getWeekLabel(),
    createdAt: now,
    updatedAt: now,
    isActive: true,
    days,
    nutritionTargets: {
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFats,
      targetWaterLiters: waterLiters,
    },
  };
}
