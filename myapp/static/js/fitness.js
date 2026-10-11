/* ==========================================================================
   IRONFORGE TOOLS — Gym Fitness Toolkit
   Vanilla JS only. No frameworks, no backend. Everything runs client-side.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ------------------------------------------------------------------ */
  /* UTILITIES                                                          */
  /* ------------------------------------------------------------------ */

  /** Shorthand querySelector */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  /** Shorthand querySelectorAll -> real array */
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /** Round to N decimals */
  function round(num, dp) {
    var f = Math.pow(10, dp || 0);
    return Math.round(num * f) / f;
  }

  /** Show a short-lived toast message at the bottom of the screen */
  function showToast(message) {
    var toast = qs('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2600);
  }

  /** Build a circular gauge (signature UI element) as an SVG string. */
  function buildGauge(opts) {
    // opts: { value, min, max, label, valueText, category, color, size }
    var size = opts.size || 120;
    var stroke = 10;
    var radius = (size - stroke) / 2;
    var circumference = 2 * Math.PI * radius;
    var pct = Math.max(0, Math.min(1, (opts.value - opts.min) / (opts.max - opts.min)));
    var offset = circumference * (1 - pct);
    var color = opts.color || 'var(--accent)';

    return (
      '<div class="gauge">' +
        '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
          '<circle class="gauge-track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius + '"></circle>' +
          '<circle class="gauge-fill" style="stroke:' + color + '" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius +
            '" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + circumference + '"></circle>' +
        '</svg>' +
        '<div>' +
          '<div class="gauge-value">' + opts.valueText + '</div>' +
          '<div class="gauge-label">' + opts.label + '</div>' +
          (opts.category ? '<div class="gauge-category" style="color:' + color + '">' + opts.category + '</div>' : '') +
        '</div>' +
      '</div>'
    ).replace('stroke-dashoffset="' + circumference + '"', 'stroke-dashoffset="' + circumference + '" data-final-offset="' + offset + '"');
  }

  /** After a gauge has been inserted into the DOM, animate it filling in. */
  function animateGauges(container) {
    qsa('.gauge-fill', container).forEach(function (el) {
      var finalOffset = el.getAttribute('data-final-offset');
      requestAnimationFrame(function () {
        setTimeout(function () { el.style.strokeDashoffset = finalOffset; }, 60);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* FOOTER YEAR                                                        */
  /* ------------------------------------------------------------------ */
  var yearEl = qs('#footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ */
  /* TOP NAVIGATION — tab switching between the 4 tool panels           */
  /* ------------------------------------------------------------------ */
  var navButtons = qsa('.tool-nav__btn');
  var panels = qsa('.tool-panel');
  var navToggle = qs('.nav-toggle');
  var toolNav = qs('.tool-nav');

  function activatePanel(targetId) {
    panels.forEach(function (p) { p.classList.toggle('is-active', p.id === targetId); });
    navButtons.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-target') === targetId); });
    // Close mobile nav after selection
    if (toolNav.classList.contains('is-open')) {
      toolNav.classList.remove('is-open');
      navToggle.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activatePanel(btn.getAttribute('data-target'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Hero shortcut buttons that jump straight to a panel
  qsa('[data-scroll-to]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activatePanel(btn.getAttribute('data-scroll-to'));
      var target = qs('#' + btn.getAttribute('data-scroll-to'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Mobile hamburger menu
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var isOpen = toolNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ------------------------------------------------------------------ */
  /* SUB-TABS — the 4 calculators inside "Workout Calculator" panel     */
  /* ------------------------------------------------------------------ */
  var subtabButtons = qsa('.subtabs__btn');
  var calcBlocks = qsa('.calc-block');

  subtabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = 'calc-' + btn.getAttribute('data-calc');
      calcBlocks.forEach(function (b) { b.classList.toggle('is-active', b.id === target); });
      subtabButtons.forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
    });
  });

  /* Show/hide the "hip" field on the body-fat form depending on gender */
  var bfGender = qs('#bf-gender');
  var bfHipField = qs('#bf-hip-field');
  function toggleHipField() {
    if (!bfGender || !bfHipField) return;
    bfHipField.style.display = bfGender.value === 'female' ? 'flex' : 'none';
  }
  if (bfGender) {
    bfGender.addEventListener('change', toggleHipField);
    toggleHipField();
  }


  /* ====================================================================
     1. AI WORKOUT RECOMMENDER
     ==================================================================== */

  // Exercise "packs" for each training split type. Kept goal-agnostic;
  // the rep scheme / rest guidance is layered on top based on the goal.
  var exercisePacks = {
    full:  ['Barbell Back Squat', 'Flat Bench Press', 'Bent-Over Row', 'Overhead Press', 'Romanian Deadlift', 'Plank Hold'],
    upper: ['Flat Bench Press', 'Lat Pulldown / Pull-Ups', 'Seated Overhead Press', 'Barbell Row', 'Bicep Curl', 'Tricep Pushdown'],
    lower: ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press', 'Walking Lunges', 'Standing Calf Raise', 'Hanging Leg Raise'],
    push:  ['Flat Bench Press', 'Incline Dumbbell Press', 'Seated Overhead Press', 'Lateral Raise', 'Tricep Dip'],
    pull:  ['Conventional Deadlift', 'Pull-Ups / Lat Pulldown', 'Barbell Row', 'Face Pull', 'Barbell Bicep Curl'],
    legs:  ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press', 'Walking Lunges', 'Seated Calf Raise'],
    cardioSteady: ['30–40 min steady-state cardio (bike, jog, incline walk)', 'Core circuit: plank, bicycle crunch, leg raise (3 rounds)'],
    cardioHiit:  ['20 min HIIT intervals (30s hard / 90s easy)', 'Mobility & stretching (10 min)']
  };

  // Weekly split templates keyed by experience level.
  var splitTemplates = {
    beginner:      ['full', 'rest', 'full', 'rest', 'full', 'cardioSteady', 'rest'],
    intermediate:  ['upper', 'lower', 'rest', 'upper', 'lower', 'cardioSteady', 'rest'],
    advanced:      ['push', 'pull', 'legs', 'rest', 'push', 'pull', 'legs']
  };

  // Rep-scheme / rest guidance layered on according to the stated goal.
  var goalSchemes = {
    'fat-loss':    { sets: '3–4 sets', reps: '12–15 reps', rest: '45–60 sec rest', note: 'Keep rest periods short to maximize calorie burn — finish each session with the cardio/core block.' },
    'muscle-gain': { sets: '4 sets', reps: '8–12 reps', rest: '60–90 sec rest', note: 'Progressive overload is key — add small amounts of weight or reps each week.' },
    'strength':    { sets: '5 sets', reps: '3–6 reps', rest: '2–3 min rest', note: 'Prioritize the big compound lifts and track your top set weight every week.' },
    'endurance':   { sets: '3 sets', reps: '15–20 reps / circuit', rest: '30–45 sec rest', note: 'Blend resistance work with conditioning — heart rate should stay elevated.' },
    'general':     { sets: '3 sets', reps: '10–12 reps', rest: '60 sec rest', note: 'A balanced mix of strength and conditioning to keep you fit and healthy.' }
  };

  var focusLabels = {
    full: 'Full Body Strength', upper: 'Upper Body', lower: 'Lower Body',
    push: 'Push (Chest, Shoulders, Triceps)', pull: 'Pull (Back, Biceps)', legs: 'Legs & Core',
    cardioSteady: 'Conditioning & Core', cardioHiit: 'HIIT & Mobility', rest: 'Rest & Recovery'
  };

  var dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function generateWorkoutPlan(data) {
    var split = splitTemplates[data.experience] || splitTemplates.beginner;
    var scheme = goalSchemes[data.goal] || goalSchemes.general;

    // Endurance-focused goal: swap one strength day for extra HIIT for variety
    if (data.goal === 'endurance') {
      split = split.map(function (d, i) { return (i === 5) ? 'cardioHiit' : d; });
    }

    var daysHtml = split.map(function (type, i) {
      if (type === 'rest') {
        return (
          '<div class="day-card">' +
            '<div><div class="day-card__name">' + dayNames[i] + '</div>' +
            '<div class="day-card__focus day-card__rest">Rest & Recovery</div>' +
            '<div class="day-card__detail">Light stretching, mobility work, or a 20–30 min walk.</div></div>' +
          '</div>'
        );
      }
      var exercises = exercisePacks[type];
      var isCardio = type === 'cardioSteady' || type === 'cardioHiit';
      var detail = isCardio
        ? exercises.join(' &middot; ')
        : exercises.slice(0, 5).join(', ') + ' — ' + scheme.sets + ' x ' + scheme.reps + ', ' + scheme.rest;

      return (
        '<div class="day-card">' +
          '<div><div class="day-card__name">' + dayNames[i] + '</div>' +
          '<div class="day-card__focus">' + focusLabels[type] + '</div>' +
          '<div class="day-card__detail">' + detail + '</div></div>' +
          '<span class="day-card__badge">' + (isCardio ? 'Conditioning' : 'Lift Day') + '</span>' +
        '</div>'
      );
    }).join('');

    var trainingDays = split.filter(function (d) { return d !== 'rest'; }).length;

    return (
      '<div class="result-content">' +
        '<div class="plan-summary">' +
          '<span class="tag tag--accent">' + trainingDays + ' training days / week</span>' +
          '<span class="tag">Goal: ' + labelize(data.goal) + '</span>' +
          '<span class="tag">Level: ' + labelize(data.experience) + '</span>' +
        '</div>' +
        '<p style="margin-bottom:16px;font-size:13.5px;">' + scheme.note + '</p>' +
        '<div class="plan-days">' + daysHtml + '</div>' +
      '</div>'
    );
  }

  function labelize(str) {
    return str.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  var workoutForm = qs('#workout-form');
  if (workoutForm) {
    workoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        age: parseInt(qs('#w-age').value, 10),
        gender: qs('#w-gender').value,
        height: parseFloat(qs('#w-height').value),
        weight: parseFloat(qs('#w-weight').value),
        goal: qs('#w-goal').value,
        experience: qs('#w-experience').value
      };
      var resultEl = qs('#workout-result');
      resultEl.innerHTML = generateWorkoutPlan(data);
      showToast('Weekly plan generated \u2713');
    });
  }


  /* ====================================================================
     2. SUPPLEMENT CALCULATOR
     ==================================================================== */

  var proteinFactors = { 'fat-loss': 2.2, 'muscle-gain': 2.0, 'strength': 2.0, 'endurance': 1.6, 'general': 1.6 };
  var activityWaterBonus = { low: 0.2, medium: 0.4, high: 0.7 };

  var supplementStacks = {
    'fat-loss':    ['Whey / Plant Protein', 'L-Carnitine', 'Green Tea Extract or Caffeine', 'Multivitamin', 'Omega-3 Fish Oil'],
    'muscle-gain': ['Whey Protein or Mass Gainer', 'Creatine Monohydrate', 'Beta-Alanine', 'Multivitamin', 'Omega-3 Fish Oil'],
    'strength':    ['Creatine Monohydrate', 'Beta-Alanine', 'Citrulline Malate (Pre-Workout)', 'Whey Protein', 'ZMA (Zinc/Magnesium)'],
    'endurance':   ['Electrolyte Mix', 'BCAA / EAA', 'Beta-Alanine', 'Whey / Plant Protein', 'Omega-3 Fish Oil'],
    'general':     ['Multivitamin', 'Whey / Plant Protein', 'Omega-3 Fish Oil', 'Vitamin D3']
  };

  function generateSupplementPlan(data) {
    var proteinG = round(data.weight * proteinFactors[data.goal], 0);
    var waterL = round(data.weight * 0.035 + activityWaterBonus[data.activity], 1);
    var creatineMaintenance = 5; // grams/day — standard maintenance dose
    var needsCreatine = data.goal === 'muscle-gain' || data.goal === 'strength';

    var stack = supplementStacks[data.goal].slice();
    if (data.diet === 'veg') {
      stack = stack.map(function (s) { return s.indexOf('Whey') === 0 ? 'Plant-Based Protein (Pea/Soy) or Whey' : s; });
      stack.push('Vitamin B12');
      stack.push('Iron (if levels are low — check with a doctor)');
    }

    return (
      '<div class="result-content">' +
        '<div class="stat-row"><span class="stat-row__label">Daily Protein Target</span><span class="stat-row__value accent">' + proteinG + ' g</span></div>' +
        '<div class="stat-row"><span class="stat-row__label">Creatine Monohydrate</span><span class="stat-row__value">' + creatineMaintenance + ' g / day</span></div>' +
        '<div class="stat-row"><span class="stat-row__label">Daily Water Intake</span><span class="stat-row__value teal">' + waterL + ' L</span></div>' +
        (needsCreatine
          ? '<p style="margin-top:10px;font-size:12.5px;">Optional loading phase: 20 g/day (split into 4 doses) for 5–7 days, then drop to the ' + creatineMaintenance + ' g/day maintenance dose.</p>'
          : '<p style="margin-top:10px;font-size:12.5px;">Creatine at ' + creatineMaintenance + ' g/day supports strength and recovery even outside pure muscle-building goals.</p>') +
        '<div class="section-title">Suggested Stack for ' + labelize(data.goal) + '</div>' +
        '<div class="tag-list">' + stack.map(function (s) { return '<span class="tag">' + s + '</span>'; }).join('') + '</div>' +
      '</div>'
    );
  }

  var supplementForm = qs('#supplement-form');
  if (supplementForm) {
    supplementForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        weight: parseFloat(qs('#s-weight').value),
        activity: qs('#s-activity').value,
        goal: qs('#s-goal').value,
        diet: qs('#s-diet').value
      };
      qs('#supplement-result').innerHTML = generateSupplementPlan(data);
      showToast('Supplement targets calculated \u2713');
    });
  }


  /* ====================================================================
     3. BODY & PERFORMANCE CALCULATORS
     ==================================================================== */

  // ---- 3a. BMI ----
  function bmiCategory(bmi) {
    if (bmi < 18.5) return { label: 'Underweight', color: 'var(--accent-3)' };
    if (bmi < 25) return { label: 'Normal', color: 'var(--success)' };
    if (bmi < 30) return { label: 'Overweight', color: 'var(--accent-3)' };
    return { label: 'Obese', color: 'var(--danger)' };
  }

  var bmiForm = qs('#bmi-form');
  if (bmiForm) {
    bmiForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var heightCm = parseFloat(qs('#bmi-height').value);
      var weightKg = parseFloat(qs('#bmi-weight').value);
      var heightM = heightCm / 100;
      var bmi = round(weightKg / (heightM * heightM), 1);
      var cat = bmiCategory(bmi);

      var resultEl = qs('#bmi-result');
      resultEl.innerHTML =
        '<div class="result-content">' +
          buildGauge({ value: bmi, min: 12, max: 42, label: 'BMI', valueText: bmi, category: cat.label, color: cat.color }) +
          '<p style="font-size:12.5px;">Healthy range is generally 18.5–24.9. BMI does not account for muscle mass, so very muscular athletes may read higher than expected.</p>' +
        '</div>';
      animateGauges(resultEl);
    });
  }

  // ---- 3b. BMR (Mifflin-St Jeor) ----
  var bmrForm = qs('#bmr-form');
  if (bmrForm) {
    bmrForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var age = parseFloat(qs('#bmr-age').value);
      var gender = qs('#bmr-gender').value;
      var height = parseFloat(qs('#bmr-height').value);
      var weight = parseFloat(qs('#bmr-weight').value);

      var bmr = gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
      bmr = round(bmr, 0);

      qs('#bmr-result').innerHTML =
        '<div class="result-content">' +
          '<div class="stat-row"><span class="stat-row__label">Basal Metabolic Rate</span><span class="stat-row__value accent">' + bmr + ' kcal/day</span></div>' +
          '<p style="margin-top:10px;font-size:12.5px;">This is the energy your body burns at complete rest. Multiply by an activity factor (see the Daily Calories tab) to find your total daily energy needs.</p>' +
        '</div>';
    });
  }

  // ---- 3c. Daily Calories / TDEE ----
  var caloriesForm = qs('#calories-form');
  if (caloriesForm) {
    caloriesForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var age = parseFloat(qs('#cal-age').value);
      var gender = qs('#cal-gender').value;
      var height = parseFloat(qs('#cal-height').value);
      var weight = parseFloat(qs('#cal-weight').value);
      var activity = parseFloat(qs('#cal-activity').value);

      var bmr = gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

      var maintenance = round(bmr * activity, 0);
      var cutting = maintenance - 500;
      var bulking = maintenance + 300;

      qs('#calories-result').innerHTML =
        '<div class="result-content">' +
          '<div class="stat-row"><span class="stat-row__label">Maintenance (TDEE)</span><span class="stat-row__value">' + maintenance + ' kcal</span></div>' +
          '<div class="stat-row"><span class="stat-row__label">Fat Loss Target</span><span class="stat-row__value accent">' + cutting + ' kcal</span></div>' +
          '<div class="stat-row"><span class="stat-row__label">Muscle Gain Target</span><span class="stat-row__value teal">' + bulking + ' kcal</span></div>' +
          '<p style="margin-top:10px;font-size:12.5px;">Fat loss target uses a ~500 kcal deficit; muscle gain uses a ~300 kcal surplus. Adjust by 100–200 kcal every 2 weeks based on real-world progress.</p>' +
        '</div>';
    });
  }

  // ---- 3d. Body Fat Estimator (U.S. Navy method) ----
  function log10(x) { return Math.log(x) / Math.LN10; }

  function bodyFatCategory(bf, gender) {
    var ranges = gender === 'male'
      ? [[0, 6, 'Essential Fat'], [6, 14, 'Athletic'], [14, 18, 'Fitness'], [18, 25, 'Average'], [25, 100, 'Above Average']]
      : [[0, 14, 'Essential Fat'], [14, 21, 'Athletic'], [21, 25, 'Fitness'], [25, 32, 'Average'], [32, 100, 'Above Average']];
    for (var i = 0; i < ranges.length; i++) {
      if (bf >= ranges[i][0] && bf < ranges[i][1]) return ranges[i][2];
    }
    return 'Average';
  }

  var bodyfatForm = qs('#bodyfat-form');
  if (bodyfatForm) {
    bodyfatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var gender = qs('#bf-gender').value;
      var height = parseFloat(qs('#bf-height').value);
      var neck = parseFloat(qs('#bf-neck').value);
      var waist = parseFloat(qs('#bf-waist').value);
      var hip = parseFloat(qs('#bf-hip').value) || 0;

      var resultEl = qs('#bodyfat-result');

      if (gender === 'female' && (!hip || hip <= 0)) {
        resultEl.innerHTML = '<div class="result-content"><p style="color:var(--danger);">Please enter your hip measurement — it is required for the female body-fat formula.</p></div>';
        return;
      }

      var bf;
      if (gender === 'male') {
        bf = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450;
      } else {
        bf = 495 / (1.29579 - 0.35004 * log10(waist + hip - neck) + 0.22100 * log10(height)) - 450;
      }
      bf = round(bf, 1);
      var category = bodyFatCategory(bf, gender);

      resultEl.innerHTML =
        '<div class="result-content">' +
          buildGauge({ value: bf, min: 3, max: 45, label: 'Body Fat %', valueText: bf + '%', category: category, color: 'var(--accent-2)' }) +
          '<p style="font-size:12.5px;">Estimated using the U.S. Navy circumference method. This is a quick estimate — calipers, DEXA, or BIA scans are more precise.</p>' +
        '</div>';
      animateGauges(resultEl);
    });
  }


  /* ====================================================================
     4. WEEKLY DIET PLANNER
     ==================================================================== */

  var mealPlans = {
    veg: {
      breakfast: ['Oats with milk, banana & almonds', 'Vegetable poha with peanuts', 'Greek yogurt with berries & granola', 'Paneer stuffed paratha with curd', 'Moong dal chilla with mint chutney', 'Smoothie: spinach, banana, peanut butter, milk', 'Idli with sambar & coconut chutney'],
      lunch: ['Rajma, brown rice & cucumber salad', 'Chickpea (chana) curry with roti & salad', 'Paneer tikka bowl with quinoa', 'Mixed vegetable curry with brown rice', 'Lentil (dal) soup, roti & sautéed greens', 'Tofu stir-fry with brown rice', 'Sprouts & vegetable pulao with raita'],
      dinner: ['Grilled paneer with steamed vegetables', 'Vegetable soup with whole-grain toast', 'Dal tadka with roti & salad', 'Stir-fried tofu & broccoli with quinoa', 'Palak paneer with brown rice', 'Vegetable khichdi with curd', 'Chickpea salad with olive oil & lemon'],
      snack: ['Roasted chana & fruit', 'Greek yogurt with nuts', 'Protein shake (plant-based) & banana', 'Hummus with carrot & cucumber sticks', 'Mixed nuts & seeds', 'Sprouts chaat', 'Peanut butter on whole-grain toast']
    },
    nonveg: {
      breakfast: ['Egg whites omelet with whole-grain toast', 'Boiled eggs with oats & fruit', 'Greek yogurt with berries & granola', 'Chicken sausage with sautéed veggies', 'Smoothie: whey protein, banana, milk', 'Scrambled eggs with spinach', 'Tuna & whole-grain toast'],
      lunch: ['Grilled chicken breast, brown rice & salad', 'Fish curry with steamed rice & greens', 'Turkey/chicken wrap with vegetables', 'Egg curry with roti & salad', 'Grilled fish with quinoa & vegetables', 'Chicken stir-fry with brown rice', 'Lean beef/chicken bowl with sweet potato'],
      dinner: ['Grilled chicken with steamed vegetables', 'Baked fish with sautéed greens', 'Chicken soup with whole-grain toast', 'Egg bhurji with roti & salad', 'Shrimp stir-fry with brown rice', 'Grilled turkey with quinoa', 'Chicken salad with olive oil & lemon'],
      snack: ['Boiled eggs & fruit', 'Whey protein shake & banana', 'Grilled chicken strips', 'Greek yogurt with nuts', 'Tuna on whole-grain crackers', 'Mixed nuts & seeds', 'Cottage cheese with fruit']
    }
  };

  var dietGoalMeta = {
    'weight-loss':  { calories: '1,600 – 2,000 kcal/day', macro: 'High protein, moderate carbs, controlled fat, calorie deficit', portionNote: ' (smaller portion, extra vegetables)' },
    'muscle-gain':  { calories: '2,700 – 3,200 kcal/day', macro: 'High protein, higher carbs, calorie surplus', portionNote: ' (larger portion, add extra rice/carb source)' },
    'maintenance':  { calories: '2,100 – 2,500 kcal/day', macro: 'Balanced protein, carbs and fat at maintenance calories', portionNote: '' }
  };

  function generateDietPlan(goal, type) {
    var meals = mealPlans[type];
    var meta = dietGoalMeta[goal];

    var daysHtml = dayNames.map(function (day, i) {
      var b = meals.breakfast[i % meals.breakfast.length];
      var l = meals.lunch[i % meals.lunch.length];
      var d = meals.dinner[i % meals.dinner.length];
      var s = meals.snack[i % meals.snack.length];

      return (
        '<div class="diet-day">' +
          '<h3>' + day + '</h3>' +
          '<div class="diet-meal"><div class="diet-meal__label">Breakfast</div><div class="diet-meal__text">' + b + meta.portionNote + '</div></div>' +
          '<div class="diet-meal"><div class="diet-meal__label">Lunch</div><div class="diet-meal__text">' + l + meta.portionNote + '</div></div>' +
          '<div class="diet-meal"><div class="diet-meal__label">Snack</div><div class="diet-meal__text">' + s + '</div></div>' +
          '<div class="diet-meal"><div class="diet-meal__label">Dinner</div><div class="diet-meal__text">' + d + meta.portionNote + '</div></div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="result-content">' +
        '<div class="diet-summary-card">' +
          '<div class="diet-summary-item"><strong>' + meta.calories + '</strong><span>Target Calories</span></div>' +
          '<div class="diet-summary-item"><strong>' + labelize(type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian') + '</strong><span>Diet Style</span></div>' +
          '<div class="diet-summary-item" style="flex:1;min-width:200px;"><strong style="font-size:13px;">' + meta.macro + '</strong><span>Macro Focus</span></div>' +
        '</div>' +
        '<div class="diet-grid">' + daysHtml + '</div>' +
      '</div>'
    );
  }

  var dietForm = qs('#diet-form');
  if (dietForm) {
    dietForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var goal = qs('#d-goal').value;
      var type = qs('#d-type').value;
      qs('#diet-result').innerHTML = generateDietPlan(goal, type);
      showToast('7-day meal plan ready \u2713');
    });
  }


  /* ====================================================================
     5. GYM ASSISTANT CHATBOT
     ==================================================================== */

  var chatLauncher = qs('#chat-launcher');
  var chatPanel = qs('#chat-panel');
  var chatMessages = qs('#chat-messages');
  var chatForm = qs('#chat-form');
  var chatInput = qs('#chat-input');
  var chatQuick = qs('#chat-quick');

  // Knowledge base: each rule has keywords to match against user input
  // and one or more possible replies (a random one is picked for variety).
  var chatRules = [
    {
      keywords: ['protein', 'how much protein'],
      replies: ['For most lifters, 1.6–2.2 g of protein per kg of body weight per day works well — higher end if you\'re cutting calories. Try the Supplement Calculator tab for a number tailored to you!']
    },
    {
      keywords: ['creatine'],
      replies: ['Creatine monohydrate at 3–5 g per day is one of the most well-researched supplements for strength and muscle gain. You can take it any time of day — consistency matters more than timing.']
    },
    {
      keywords: ['water', 'hydration', 'how much water'],
      replies: ['A good baseline is about 35 ml of water per kg of body weight per day, plus extra on training days. Check the Supplement Calculator for a personalized target.']
    },
    {
      keywords: ['lose weight', 'fat loss', 'cutting', 'lose fat'],
      replies: ['Fat loss comes down to a moderate calorie deficit (around 500 kcal/day below maintenance), high protein intake, and consistent resistance training plus some cardio. Try the Diet Planner and Calculators tabs to get exact numbers.']
    },
    {
      keywords: ['muscle', 'bulk', 'gain weight', 'mass'],
      replies: ['To build muscle, train with progressive overload 4–6 days/week, eat in a small calorie surplus (~300 kcal above maintenance), and hit 1.6–2.2 g/kg protein daily. The Workout AI tab can build you a full split.']
    },
    {
      keywords: ['bmi'],
      replies: ['BMI is weight divided by height squared — a quick (not perfect) screening tool. Head to Calculators → BMI to get yours instantly.']
    },
    {
      keywords: ['bmr', 'metabolism', 'metabolic rate'],
      replies: ['Your BMR is the number of calories your body burns at complete rest. Check Calculators → BMR — I use the Mifflin-St Jeor formula, which is considered one of the most accurate.']
    },
    {
      keywords: ['calorie', 'calories', 'tdee', 'how many calories'],
      replies: ['Your daily calorie needs (TDEE) = BMR × activity multiplier. Use Calculators → Daily Calories to see your maintenance, cutting and bulking numbers.']
    },
    {
      keywords: ['body fat', 'bodyfat', 'fat percentage'],
      replies: ['I can estimate body fat % using the U.S. Navy tape-measure method — just your neck, waist (and hip for women) plus height. Try Calculators → Body Fat %.']
    },
    {
      keywords: ['diet plan', 'meal plan', 'what should i eat', 'nutrition plan'],
      replies: ['Head over to the Diet Planner tab — pick your goal (weight loss, muscle gain or maintenance) and whether you eat vegetarian or non-vegetarian, and I\'ll build you a full 7-day plan.']
    },
    {
      keywords: ['vegetarian', 'veg diet', 'plant based'],
      replies: ['Vegetarian lifters can absolutely hit their protein targets with paneer, tofu, lentils, Greek yogurt, chickpeas and a plant-based protein powder. The Diet Planner has a full vegetarian week ready to go.']
    },
    {
      keywords: ['workout plan', 'training split', 'routine', 'program'],
      replies: ['The Workout AI tab builds a full 7-day split based on your goal and experience level — beginners get full-body days, advanced lifters get a push/pull/legs split.']
    },
    {
      keywords: ['rest day', 'rest', 'recovery', 'sore', 'soreness'],
      replies: ['Rest days matter as much as training days — that\'s when your muscles actually rebuild. Aim for at least 1–2 full rest or active-recovery days per week, and prioritize 7–9 hours of sleep.']
    },
    {
      keywords: ['cardio', 'running', 'hiit'],
      replies: ['Both steady-state cardio and HIIT work well — steady-state is easier to recover from, HIIT is more time-efficient. 2–4 sessions a week is a solid range for most goals.']
    },
    {
      keywords: ['pre workout', 'pre-workout'],
      replies: ['A good pre-workout typically has caffeine, citrulline malate, and beta-alanine. If you\'re sensitive to stimulants, look for a caffeine-free version, or just use black coffee!']
    },
    {
      keywords: ['whey', 'protein powder', 'protein shake'],
      replies: ['Whey protein is fast-digesting and great post-workout; casein digests slowly and works well before bed. Plant-based blends (pea + rice) are solid vegetarian/vegan alternatives.']
    },
    {
      keywords: ['supplement', 'supplements', 'stack'],
      replies: ['The core, evidence-backed stack for most people is: protein powder, creatine monohydrate, a multivitamin and omega-3. Check the Supplement Calculator tab for a plan tailored to your goal.']
    },
    {
      keywords: ['beginner', 'new to gym', 'just starting', 'start gym'],
      replies: ['Welcome to the gym! Start with full-body training 3x/week, focus on learning proper form on the big compound lifts, and don\'t worry about supplements until your training and diet are consistent. The Workout AI tab can build your first plan.']
    },
    {
      keywords: ['hello', 'hi', 'hey', 'yo'],
      replies: ['Hey there! I\'m Coach Forge \u{1F4AA}. Ask me about workouts, diet, supplements, or how to use any of the calculators.']
    },
    {
      keywords: ['thank', 'thanks'],
      replies: ['Anytime! Now go crush that next session. \u{1F4AA}']
    },
    {
      keywords: ['bye', 'goodbye', 'see you'],
      replies: ['See you at the gym! Stay consistent and the results will follow.']
    }
  ];

  var fallbackReplies = [
    'I\'m not totally sure about that one — but I can help with workouts, diet, supplements, or any of the calculators. Try asking about "protein", "workout plan", or "BMI".',
    'Good question! I specialize in gym-related topics like training splits, nutrition, and supplements — try rephrasing, or tap one of the quick suggestions below.'
  ];

  var quickQuestions = [
    'How much protein do I need?',
    'Build me a workout plan',
    'What should I eat to lose fat?',
    'How much creatine should I take?',
    'What is my BMI?'
  ];

  function findChatReply(input) {
    var lower = input.toLowerCase();
    for (var i = 0; i < chatRules.length; i++) {
      var rule = chatRules[i];
      for (var k = 0; k < rule.keywords.length; k++) {
        if (lower.indexOf(rule.keywords[k]) !== -1) {
          var replies = rule.replies;
          return replies[Math.floor(Math.random() * replies.length)];
        }
      }
    }
    return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
  }

  function appendMessage(text, sender) {
    var msg = document.createElement('div');
    msg.className = 'chat-msg ' + sender;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTypingIndicator() {
    var typing = document.createElement('div');
    typing.className = 'chat-msg bot chat-typing-wrap';
    typing.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
    typing.style.padding = '0';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typing;
  }

  function sendUserMessage(text) {
    if (!text.trim()) return;
    appendMessage(text, 'user');
    chatInput.value = '';
    var typingEl = showTypingIndicator();
    var delay = 500 + Math.random() * 500;
    setTimeout(function () {
      typingEl.remove();
      appendMessage(findChatReply(text), 'bot');
    }, delay);
  }

  function renderQuickChips() {
    chatQuick.innerHTML = quickQuestions.map(function (q) {
      return '<button type="button" class="chat-chip">' + q + '</button>';
    }).join('');
    qsa('.chat-chip', chatQuick).forEach(function (chip) {
      chip.addEventListener('click', function () { sendUserMessage(chip.textContent); });
    });
  }

  function initChat() {
    appendMessage('Hey! I\'m Coach Forge, your gym assistant. Ask me anything about workouts, diet, supplements, or how to use these tools.', 'bot');
    renderQuickChips();
  }

  var chatInitialized = false;

  if (chatLauncher && chatPanel) {
    chatLauncher.addEventListener('click', function () {
      var isOpen = chatPanel.classList.toggle('is-open');
      chatLauncher.classList.toggle('is-open', isOpen);
      chatLauncher.setAttribute('aria-expanded', String(isOpen));
      if (isOpen && !chatInitialized) {
        initChat();
        chatInitialized = true;
      }
      if (isOpen) chatInput.focus();
    });
  }

  if (chatForm) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sendUserMessage(chatInput.value);
    });
  }

});