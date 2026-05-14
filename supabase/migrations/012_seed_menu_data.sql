-- Seed practical menu items for the customer-facing digital menu and admin CRUD flows.
-- This migration is safe to re-run because each row is inserted only when the name is absent.

INSERT INTO public.menu (
    name,
    description,
    price,
    category,
    image_url,
    is_available,
    sort_order
)
SELECT
    seed.name,
    seed.description,
    seed.price,
    seed.category,
    seed.image_url,
    seed.is_available,
    seed.sort_order
FROM (
    VALUES
        ('French Onion Soup', 'Caramelized onions, beef broth, gruyere toast', 12.00, 'starters'::public.menu_category, NULL, true, 10),
        ('Caesar Salad', 'Romaine, shaved parmesan, crisp croutons', 11.00, 'starters'::public.menu_category, NULL, true, 20),
        ('Beef Wellington', 'Fillet of beef wrapped in puff pastry with mushroom duxelles', 42.00, 'mains'::public.menu_category, NULL, true, 30),
        ('Herb-Crusted Salmon', 'Roasted salmon, lemon butter, seasonal greens', 34.00, 'mains'::public.menu_category, NULL, true, 40),
        ('Truffle Mac and Cheese', 'Three-cheese sauce, truffle crumb, baked golden', 15.00, 'sides'::public.menu_category, NULL, true, 50),
        ('Buttered Asparagus', 'Charred asparagus with sea salt and lemon zest', 9.00, 'sides'::public.menu_category, NULL, true, 60),
        ('Sticky Toffee Pudding', 'Warm date sponge, toffee sauce, vanilla cream', 13.00, 'desserts'::public.menu_category, NULL, true, 70),
        ('Seasonal Citrus Tart', 'Bright lemon-orange custard with a shortcrust shell', 12.00, 'desserts'::public.menu_category, NULL, true, 80),
        ('Sparkling Elderflower Spritz', 'Elderflower cordial, soda, citrus, fresh mint', 8.00, 'beverages'::public.menu_category, NULL, true, 90)
) AS seed(name, description, price, category, image_url, is_available, sort_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.menu menu
    WHERE menu.name = seed.name
);