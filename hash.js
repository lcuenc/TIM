// hash.js
import bcrypt from "bcryptjs";

const run = async () => {
  const hash = await bcrypt.hash("admin123", 10);
  console.log(hash);
};

run();
