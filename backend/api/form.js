const pool = require("../db");
const authMiddleware = require("../middleware/auth");

module.exports = (app) => {

    // ============================================
    // GET TODAY'S FORM STATUS
    // ============================================
    app.get(
        "/api/form/today-status",
        authMiddleware,
        async (req, res) => {

            if (req.user.role !== "user") {
                return res.status(403).json({
                    message: "Access denied",
                });
            }

            try {
                const result = await pool.query(
                    `SELECT
              submission_id,
              submission_date
           FROM public.form_submissions
           WHERE dcs_id = $1
             AND submission_date =
                 ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
           LIMIT 1`,
                    [req.user.dcs_id]
                );

                const todayResult = await pool.query(
                    `SELECT
             ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)::text
             AS today`
                );

                const today = todayResult.rows[0].today;

                return res.status(200).json({
                    submitted: result.rows.length > 0,
                    date: today,
                });

            } catch (err) {
                console.error("Today status error:", err);

                return res.status(500).json({
                    message: "Unable to check today's form status",
                });
            }
        }
    );


    // ============================================
    // SUBMIT TODAY'S FORM
    // ============================================
    app.post(
        "/api/form/submit",
        authMiddleware,
        async (req, res) => {

            if (req.user.role !== "user") {
                return res.status(403).json({
                    message: "Only DCS users can submit the form",
                });
            }

            const {
                committee_formation_date,
                total_active_members,
                member,
                non_member,
                achievement_15_days,
                achievement_monthly,

                monthly_target,
                current_month_target,
                week_1_achievement,
                week_2_achievement,
                week_3_achievement,
                week_4_achievement,
                total_achievement,

                milk_producing_members,
                dat_activated_producers,
                dat_receiving_producers,
                payment_1_to_10,
                payment_11_to_20,
                payment_21_to_31,

                meeting_members_present,
                audit_status,
            } = req.body;

            try {

                const result = await pool.query(
                    `INSERT INTO public.form_submissions (
            union_id,
            dcs_id,
            committee_formation_date,
            total_active_members,
            member,
            non_member,
            achievement_15_days,
            achievement_monthly,
            monthly_target,
            current_month_target,
            week_1_achievement,
            week_2_achievement,
            week_3_achievement,
            week_4_achievement,
            total_achievement,
            milk_producing_members,
            dat_activated_producers,
            dat_receiving_producers,
            payment_1_to_10,
            payment_11_to_20,
            payment_21_to_31,
            meeting_members_present,
            audit_status,
            submission_date
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23,
            ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date)
          )
          RETURNING
            submission_id,
            submission_date`,
                    [
                        req.user.union_id,
                        req.user.dcs_id,

                        committee_formation_date || null,
                        total_active_members || null,
                        member !== undefined && member !== "" && member !== null ? parseInt(member, 10) : null,
                        non_member !== undefined && non_member !== "" && non_member !== null ? parseInt(non_member, 10) : null,
                        achievement_15_days || null,
                        achievement_monthly || null,

                        monthly_target || null,
                        current_month_target || null,
                        week_1_achievement || null,
                        week_2_achievement || null,
                        week_3_achievement || null,
                        week_4_achievement || null,
                        total_achievement || null,

                        milk_producing_members || null,
                        dat_activated_producers || null,
                        dat_receiving_producers || null,

                        payment_1_to_10 || null,
                        payment_11_to_20 || null,
                        payment_21_to_31 || null,

                        meeting_members_present || null,
                        audit_status || null,
                    ]
                );

                const submissionDate = result.rows[0].submission_date;

                const formattedDate = new Date(
                    `${submissionDate}T00:00:00+05:30`
                ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                });

                return res.status(201).json({
                    message: `You have filled the form for today, ${formattedDate}. Thanks.`,
                    submitted: true,
                    date: submissionDate,
                });

            } catch (err) {

                // PostgreSQL unique constraint violation
                if (err.code === "23505") {
                    return res.status(409).json({
                        message: "You have already filled the form for today. Thanks.",
                        submitted: true,
                    });
                }

                console.error("Form submission error:", err);

                return res.status(500).json({
                    message: "Unable to submit form",
                });
            }
        }
    );

};