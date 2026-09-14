const jwt = require("jsonwebtoken");
const pool = require("../db");
const { authlimiter } = require("../middleware/rateLimiters");

module.exports = (app) => {

  //dcs login 

  app.post("/api/auth/user-login", authlimiter, async (req, res) => {
    console.time("user-login");

    const { dcs_phone_no, password } = req.body;

    if (!dcs_phone_no || !password) {
      console.timeEnd("user-login");

      return res.status(400).json({
        message: "Phone number and password are required",
      });
    }

    try {
      const result = await pool.query(
        `SELECT
          d.dcs_id,
          d.union_id,
          u.un_name,
          d.dcs_no,
          d.dcs_code,
          d.dcs_name,
          d.dcs_phone_no,
          d.secretary_name
        FROM public.dcs_master d
        LEFT JOIN public.union_master u
          ON d.union_id = u.union_id
        WHERE d.dcs_phone_no = $1`,
        [dcs_phone_no]
      );

      if (result.rows.length === 0) {
        console.timeEnd("user-login");

        return res.status(401).json({
          message: "Invalid phone number or password",
        });
      }

      if (password !== "COMFED@1234") {
        console.timeEnd("user-login");

        return res.status(401).json({
          message: "Invalid phone number or password",
        });
      }

      const dcs = result.rows[0];

      const token = jwt.sign(
        {
          role: "user",
          dcs_id: dcs.dcs_id,
          union_id: dcs.union_id,
          dcs_phone_no: dcs.dcs_phone_no,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      console.timeEnd("user-login");

      return res.status(200).json({
        message: `Welcome, ${dcs.dcs_name} DCS!`,
        status: 200,
        token,

        user: {
          role: "user",
          union_name: dcs.un_name,
          dcs_no: dcs.dcs_no,
          dcs_code: dcs.dcs_code,
          dcs_name: dcs.dcs_name,
          dcs_phone_no: dcs.dcs_phone_no,
          secretary_name: dcs.secretary_name,
        },
      });

    } catch (err) {
      console.error("User login error:", err);
      console.timeEnd("user-login");

      return res.status(500).json({
        message: "Login failed",
      });
    }
  });


  // admin login 

  app.post("/api/auth/admin-login", authlimiter, async (req, res) => {
    console.time("admin-login");

    const { admin_phone_no, password } = req.body;

    if (!admin_phone_no || !password) {
      console.timeEnd("admin-login");

      return res.status(400).json({
        message: "Phone number and password are required",
      });
    }

    try {
      const result = await pool.query(
        `SELECT
          indexing,
          admin_phone_no,
          password
        FROM public.admin_users
        WHERE admin_phone_no = $1`,
        [admin_phone_no]
      );

      if (result.rows.length === 0) {
        console.timeEnd("admin-login");

        return res.status(401).json({
          message: "Invalid phone number or password",
        });
      }

      const admin = result.rows[0];

      if (password !== admin.password) {
        console.timeEnd("admin-login");

        return res.status(401).json({
          message: "Invalid phone number or password",
        });
      }

      const token = jwt.sign(
        {
          role: "admin",
          admin_phone_no: admin.admin_phone_no,
          admin_id: admin.indexing,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      console.timeEnd("admin-login");

      return res.status(200).json({
        message: "Welcome Admin!",
        status: 200,
        token,

        user: {
          role: "admin",
          admin_phone_no: admin.admin_phone_no,
          admin_id: admin.indexing,
        },
      });

    } catch (err) {
      console.error("Admin login error:", err);
      console.timeEnd("admin-login");

      return res.status(500).json({
        message: "Login failed",
      });
    }
  });

};
