insert into scripts (type, trigger_text, response_text, sort_order) values

-- 1. Price is too high
('objection', 'The price is too high', 'Compared to what? Most clients see ROI within 2–3 months just from new leads the site brings in.', 0),
('objection', 'The price is too high', 'What budget were you thinking? We have packages at different price points — let''s find something that works.', 1),
('objection', 'The price is too high', 'Think of it as an investment, not a cost. A website works 24/7 for you — unlike any employee or ad.', 2),

-- 2. Already have a website
('objection', 'We already have a website', 'When was it last updated? If it''s more than 2–3 years old, it''s likely hurting more than helping — especially on mobile.', 0),
('objection', 'We already have a website', 'Is it actually bringing in leads? A lot of our clients came to us with websites — the issue was theirs wasn''t converting.', 1),
('objection', 'We already have a website', 'We''re not here to replace it just to replace it. We''d look at what you have and tell you honestly if it''s working.', 2),

-- 3. We get all our business from referrals
('objection', 'We get all our work from referrals', 'That''s a great sign. But what happens when a referral checks you out online and can''t find you — or finds a competitor instead?', 0),
('objection', 'We get all our work from referrals', 'Referrals are great. A website makes every referral more powerful — it validates you before the call even happens.', 1),

-- 4. Need to think about it
('objection', 'I need to think about it', 'Of course. What specifically are you unsure about? I''d rather address it now than have you think about the wrong thing.', 0),
('objection', 'I need to think about it', 'Most people who say that are usually concerned about price or whether it''ll actually work. Which one is it for you?', 1),
('objection', 'I need to think about it', 'How long are you thinking? I ask because we only take on a few clients per month — I want to make sure we can still fit you in.', 2),

-- 5. Need to talk to my partner
('objection', 'I need to talk to my partner', 'Makes sense. What would help make that conversation easier? I can put together a one-pager showing exactly what you get and the expected return.', 0),
('objection', 'I need to talk to my partner', 'What does your partner usually want to know before a decision like this? Let''s make sure we cover it.', 1),

-- 6. Already have someone handling it
('objection', 'We already have someone for that', 'Are you happy with the results it''s bringing in? Most people say yes someone handles it — but when I ask if it''s generating leads, that answer changes.', 0),
('objection', 'We already have someone for that', 'We''re not asking you to fire anyone. We just want to show you what a high-converting site looks like. Sometimes seeing is believing.', 1),

-- 7. Don't have time
('objection', 'I don''t have time for this right now', 'That''s exactly why you should let us handle it. You don''t do anything — we build it, you approve it, done. Two weeks.', 0),
('objection', 'I don''t have time for this right now', 'When would be a better time? I can follow up in two weeks, or send everything over email so you can review on your own schedule.', 1),

-- 8. How do I know it'll work
('objection', 'How do I know it will actually bring in customers', 'We build sites optimized for Google local search — so when someone in your area searches for what you do, you show up. We can show you live examples.', 0),
('objection', 'How do I know it will actually bring in customers', 'We can''t guarantee customers, but we can guarantee a site built to convert. We''ll walk you through the strategy before you commit to anything.', 1),
('objection', 'How do I know it will actually bring in customers', 'Look at it this way — right now you have zero online presence working for you. Even a modest result is better than nothing.', 2),

-- 9. Can just use Wix/Squarespace
('objection', 'I can just use Wix or build it myself', 'You definitely can. The difference is a DIY site and a site built to rank on Google and convert visitors. One makes you look legit, the other makes you money.', 0),
('objection', 'I can just use Wix or build it myself', 'Wix is fine for a digital business card. We build lead generation machines. If all you need is online presence, Wix works — if you want it to bring in business, that''s a different product.', 1),

-- 10. My nephew / someone I know will do it
('objection', 'My nephew / someone I know will build it', 'That works — and some of them are great. But most of the time, when they get busy, it never gets done. We deliver in 2 weeks, guaranteed.', 0),
('objection', 'My nephew / someone I know will build it', 'Ask yourself: will it rank on Google, load fast on mobile, and convert visitors to calls? If not, it might cost more in missed business than what we charge.', 1);
