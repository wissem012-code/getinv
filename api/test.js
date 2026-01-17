/**
 * Simple test function to verify Vercel detects serverless functions
 */

export default async function handler(req, res) {
  return res.status(200).json({ 
    message: "Test function works!",
    url: req.url,
    method: req.method 
  });
}
