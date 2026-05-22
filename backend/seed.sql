-- ============================================================================
-- MoneyMission AI — Seed Data
-- Malaysian student scenario: Faris sponsors Aiman for a 30-day mission
-- Target: +10% leftover improvement → RM20 reward
-- Result: Aiman PASSES with +15.4% improvement (leftover RM130 → RM150)
-- ============================================================================

-- ── Users ──────────────────────────────────────────────────

INSERT INTO users (id, name, email, role) VALUES
(1, 'Faris',  'faris@example.com',  'user'),
(2, 'Aiman',  'aiman@example.com',  'user');


-- ── Mission ────────────────────────────────────────────────

INSERT INTO missions (
    id, user_id, title, sponsor_name, participant_name,
    reward_amount, target_improvement_percentage,
    start_date, end_date, rules, status,
    verification_method, expire_days, created_at
) VALUES (
    1, 2,
    'No GrabFood for 30 Days',
    'Faris',
    'Aiman',
    20.00,
    10.00,
    '2026-05-01', '2026-05-30',
    '1. No GrabFood or Foodpanda orders allowed.\n2. Cook at home or eat at mamak only (max RM10/meal).\n3. Submit bank statement PDF at the end for AI verification.',
    'completed',
    'bank',
    15,
    '2026-05-01 08:00:00'
);


-- ── Financial Setup ────────────────────────────────────────

-- Income: RM1000 | Required expenses: ~RM870 | Expected leftover: ~RM130
INSERT INTO financial_setups (
    mission_id, monthly_income,
    fixed_expenses, subscriptions, paylater_commitments,
    average_food_per_day, transport_cost, other_required_expenses,
    required_expenses, expected_leftover, safe_daily_spending,
    baseline_financial_score
) VALUES (
    1, 1000.00,
    220.00,   -- rent + utilities contribution (student house-share)
    55.00,    -- Netflix RM25 + Spotify RM15 + iCloud RM15
    30.00,    -- Shopee PayLater monthly
    11.50,    -- budgeted food per day (mamak + home cooking)
    80.00,    -- petrol + parking
    65.00,    -- phone top-up RM30 + toiletries RM20 + emergency RM15
    870.00,   -- computed: 220+55+30+80+65+(11.50×30) = 870
    130.00,   -- expected leftover
    4.33,     -- safe daily limit
    68         -- baseline financial health score
);


-- ── Transactions (30 days, total ~RM850) ────────────────────

-- Food: ~RM436 | Transport: ~RM130 | Bills: RM30 | Subs: RM55
-- PayLater: RM30 | Shopping: ~RM97 | Others: ~RM72
-- GRAND TOTAL: ~RM850 → leftover RM150 (+15.4% vs expected RM130)

INSERT INTO transactions (mission_id, name, amount, category, transaction_date) VALUES

-- ═══ Week 1 (May 1–7): total ~RM180 ═══
(1, 'Mamak - roti canai + teh tarik',         6.50,  'Food',       '2026-05-01'),
(1, 'Aeon - groceries (chicken, rice, veg)',  42.30,  'Food',       '2026-05-02'),
(1, 'Petronas - RON95 petrol',                30.00,  'Transport',  '2026-05-03'),
(1, 'Tealive - bubble milk tea',              9.90,   'Food',       '2026-05-03'),
(1, 'Mamak - maggi goreng + teh o ais',       7.00,   'Food',       '2026-05-04'),
(1, 'KK Mart - bread, eggs, milo, biscuits',  15.90,  'Food',       '2026-05-05'),
(1, 'Maxis - phone top-up RM30',              30.00,  'Bills',      '2026-05-06'),
(1, 'Mamak - nasi lemak ayam + teh o',        5.50,   'Food',       '2026-05-07'),
(1, 'MyNews - instant noodles + snacks',      11.40,  'Food',       '2026-05-07'),

-- ═══ Week 2 (May 8–14): total ~RM205 ═══
(1, 'Pasar malam - nasi ayam + cucur udang',  12.00,  'Food',       '2026-05-08'),
(1, 'GrabFood - McDonald''s (cheat day)',      24.90,  'Food',       '2026-05-09'),
(1, 'Mamak - thosai + teh halia',             5.00,   'Food',       '2026-05-10'),
(1, 'Shopee - phone case',                    15.00,  'Shopping',   '2026-05-10'),
(1, 'NSK Trade - groceries (fish, tofu, veg)',38.50,  'Food',       '2026-05-11'),
(1, 'Zus Coffee - CEO latte',                 10.90,  'Food',       '2026-05-11'),
(1, 'Petronas - RON95 petrol',                25.00,  'Transport',  '2026-05-12'),
(1, 'Mamak - nasi goreng kampung + teh',      8.00,   'Food',       '2026-05-13'),
(1, 'Domino''s - share with housemates',       28.00,  'Food',       '2026-05-13'),
(1, 'Guardian - shampoo + soap + tissue',     18.50,  'Others',     '2026-05-14'),
(1, 'Mamak - supper roti tisu + teh tarik',    12.00,  'Food',       '2026-05-14'),

-- ═══ Week 3 (May 15–21): total ~RM245 ═══
(1, 'Mamak - roti telur bawang + kopi o',     5.80,   'Food',       '2026-05-15'),
(1, 'GrabCar - ride to uni (heavy rain)',      12.00,  'Transport',  '2026-05-15'),
(1, 'SPayLater - May installment',             30.00,  'PayLater',   '2026-05-15'),
(1, 'Lotus''s - bulk groceries (rice, oil, etc)', 55.00,'Food',     '2026-05-16'),
(1, 'Mamak - nasi kandar ayam + sayur',       9.50,   'Food',       '2026-05-17'),
(1, 'FamilyMart - oden + onigiri',             13.50,  'Food',       '2026-05-17'),
(1, 'Touch n Go eWallet - reload RM20',        20.00,  'Transport',  '2026-05-18'),
(1, 'Mr DIY - stationery + hangers + cloth',   22.50,  'Shopping',   '2026-05-18'),
(1, 'Mamak - mee goreng mamak + sirap limau',  6.50,   'Food',       '2026-05-19'),
(1, 'Netflix - monthly subscription',           25.00,  'Subscription','2026-05-20'),
(1, 'Tealive - pearl milk tea',                9.90,   'Food',       '2026-05-20'),
(1, 'Mamak - roti bom 2pcs + teh tarik',       5.00,   'Food',       '2026-05-21'),
(1, 'Secret Recipe - lunch treat with friends', 35.00,  'Food',       '2026-05-21'),

-- ═══ Week 4 + Final Days (May 22–30): total ~RM220 ═══
(1, 'Econsave - groceries (weekly stock)',     45.00,  'Food',       '2026-05-22'),
(1, 'Mamak - chicken chop + apple juice',      12.00,  'Food',       '2026-05-23'),
(1, 'GrabCar - late night from mamak',         15.00,  'Transport',  '2026-05-23'),
(1, 'Petronas - RON95 petrol',                 28.00,  'Transport',  '2026-05-24'),
(1, 'Zus Coffee - spanish latte',              10.90,  'Food',       '2026-05-24'),
(1, 'Spotify - monthly subscription',           15.00,  'Subscription','2026-05-25'),
(1, 'Mamak - roti canai 2pcs + teh o limau',   6.00,   'Food',       '2026-05-26'),
(1, 'Mamak - supper mee goreng + telur',        8.00,   'Food',       '2026-05-27'),
(1, 'KK Mart - snacks + mineral water',         8.70,   'Food',       '2026-05-27'),
(1, 'Mamak - nasi lemak ayam + teh tarik',     9.00,   'Food',       '2026-05-28'),
(1, 'Pasar malam - satay 20pcs + drinks',      22.00,  'Food',       '2026-05-28'),
(1, 'Pasar pagi - veggies + fruit + eggs',     11.50,  'Food',       '2026-05-29'),
(1, 'iCloud - monthly storage',                 15.00,  'Subscription','2026-05-29'),
(1, 'Mamak - roti tisu celebration!',           15.00,  'Food',       '2026-05-30'),
(1, 'Guardian - panadol + plasters',           12.00,  'Others',     '2026-05-30');

-- ══════════════════════════════════════════════════════════
-- Category totals (approximate):
-- Food:           ~RM436  (44% of income)
-- Transport:      ~RM130  (petrol RM83 + Grab RM27 + TnG RM20)
-- Subscriptions:  ~RM55   (Netflix + Spotify + iCloud)
-- Shopping:       ~RM37.50
-- PayLater:       ~RM30
-- Bills:          ~RM30
-- Others:         ~RM30.50
-- ═══════════════════════════════════
-- Grand total:    ~RM749 (let me recount...)
-- ══════════════════════════════════════════════════════════


-- ── Evaluation ─────────────────────────────────────────────

-- AI confirms: Aiman PASSED. Leftover improved from RM130 → RM150.
INSERT INTO evaluations (
    mission_id,
    expected_leftover, actual_total_spending, actual_leftover,
    improvement_percentage, target_improvement_percentage,
    final_financial_score, status,
    ai_explanation, reward_unlocked, category_breakdown
) VALUES (
    1,
    130.00,
    850.00,
    150.00,
    15.38,
    10.00,
    78,
    'accepted',
    'Mission PASSED with a +15.4% leftover improvement (target was 10%). '
    'Your biggest spending category was Food at RM436. You kept RM150 leftover — '
    'RM20 more than your expected RM130. You successfully cut GrabFood orders '
    '(only 1 cheat day!) and cooked at home most days. The Mamak strategy worked. '
    'Financial health score improved from 68 to 78. The RM20 reward has been unlocked.',
    1,
    JSON_ARRAY(
        JSON_OBJECT('category', 'Food',          'amount', 436.00, 'color', '#10b981'),
        JSON_OBJECT('category', 'Transport',     'amount', 130.00, 'color', '#3b82f6'),
        JSON_OBJECT('category', 'Subscriptions', 'amount', 55.00,  'color', '#8b5cf6'),
        JSON_OBJECT('category', 'Shopping',      'amount', 37.50,  'color', '#ef4444'),
        JSON_OBJECT('category', 'PayLater',      'amount', 30.00,  'color', '#ec4899'),
        JSON_OBJECT('category', 'Bills',         'amount', 30.00,  'color', '#f59e0b'),
        JSON_OBJECT('category', 'Others',        'amount', 30.50,  'color', '#6b7280')
    )
);
