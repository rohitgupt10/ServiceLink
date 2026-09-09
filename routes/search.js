const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const { parsePositiveNumber, safeText } = require("../lib/validation");

// Advanced search with filters
router.get("/search", async (req, res) => {
  try {
    const {
      query,
      category,
      minPrice,
      maxPrice,
      rating,
      sortBy,
      page = 1,
    } = req.query;
    const limit = 12;
    const currentPage = Math.floor(parsePositiveNumber(page, { min: 1, max: 10000 }) || 1);
    const skip = (currentPage - 1) * limit;

    let filter = { isActive: true, deletedAt: null };

    // Text search
    const cleanedQuery = safeText(query || "", { min: 0, max: 100 });
    if (cleanedQuery) {
      filter.$text = { $search: cleanedQuery };
    }

    // Category filter
    if (category && category !== "all") {
      filter.category = category;
    }

    // Price range filter
    const parsedMin = minPrice ? parsePositiveNumber(minPrice, { min: 0, max: 10000000 }) : null;
    const parsedMax = maxPrice ? parsePositiveNumber(maxPrice, { min: 0, max: 10000000 }) : null;
    if (parsedMin !== null) {
      filter.price = { ...filter.price, $gte: parsedMin };
    }
    if (parsedMax !== null) {
      filter.price = { ...filter.price, $lte: parsedMax };
    }

    // Rating filter
    const parsedRating = rating ? parsePositiveNumber(rating, { min: 1, max: 5 }) : null;
    if (parsedRating !== null) {
      filter.averageRating = { $gte: parsedRating };
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sortBy === "price_low") {
      sortOption = { price: 1 };
    } else if (sortBy === "price_high") {
      sortOption = { price: -1 };
    } else if (sortBy === "rating") {
      sortOption = { averageRating: -1 };
    } else if (sortBy === "popular") {
      sortOption = { viewCount: -1 };
    }

    const services = await Service.find(filter)
      .populate("provider", "name avatar averageRating isVerified")
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const totalCount = await Service.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      services,
      currentPage,
      totalPages,
      totalCount,
      success: true,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error searching services", success: false });
  }
});

// Get trending services
router.get("/trending", async (req, res) => {
  try {
    const trending = await Service.find({ isActive: true, deletedAt: null })
      .populate("provider", "name avatar averageRating")
      .sort({ viewCount: -1 })
      .limit(8);

    res.json({ services: trending, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching trending services", success: false });
  }
});

// Get top rated services
router.get("/top-rated", async (req, res) => {
  try {
    const topRated = await Service.find({
      isActive: true,
      deletedAt: null,
      totalReviews: { $gt: 0 },
    })
      .populate("provider", "name avatar averageRating")
      .sort({ averageRating: -1 })
      .limit(8);

    res.json({ services: topRated, success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching top rated services", success: false });
  }
});

module.exports = router;
