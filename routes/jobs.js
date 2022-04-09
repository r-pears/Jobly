"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobSearchSchema = require("../schemas/jobSearch.json");

const router = express.Router({ mergeParams: true });

/** POST / { job } => { job }
 * 
 * job should be { title, salary, equity, companyHandle }
 * 
 * Returns { id, title, salary, equity companyHandle }
 * 
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);

    if (!validator.valid) {
      const errors = validator.errors.map(e => e.stack);
      throw new BadRequestError(errors);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (error) {
    return next(error);
  }
});
 
/** GET / =>
 *  { jobs: [ { id, title, salary, equity, companyHandle, companyName }, ...] }
 * 
 * Can provide search filter in query:
 * – minSalary
 * – hasEquity (true returns only jobs with equity > 0, other values ignored)
 * – title (will find case-insensitive, partial matches)
 * 
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  const q = req.query;
  // querystring will be strinsg that we convert into int/bool.

  if (q.minSalary !== undefined) q.minSalary = +q.minSalary;
  q.hasEquity = q.hasEquity === "true";

  try {
    const validator = jsonschema.validate(q, jobSearchSchema);;
    if (!validator.validate) {
      const errors = validator.errors.map(e => e.stack);
      throw new BadRequestError(errors);
    }

    const jobs = await Job.findAll(q);
    return res.json({ jobs });
  } catch (error) {
    return next(error);
  }
});

/** GET /[jobId] => { job }
 * 
 * Returns { id, title, salary, equity, company }
 *  where company is { handle, name, description, numEmployees, logoUrl }
 * 
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);

    return res.json({ job });
  } catch (error) {
    return next(error);
  }
});

/** PATCH /[jobId] { fld1, fld2, ... } => { job }
 * 
 * Data can include: { title, salary, equity }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: admin
 */

router.patch("/:id", ensureAdmin, async function () {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);

    if (!validator.valid) {
      const errors = validator.errors.map(e => e.stack);
      throw new BadRequestError(errors);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (error) {
    return next(error);
  }
});

/** DELETE /[handle] => { deleted: id } 
 * 
 * Authorization required: admin
*/

router.delete("/:id", ensureAdmin, async function (req, res, next) {
  try {
    await Job.remove(req.params.id);
    return res.json({ deleted: +req.params.id });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;