import axios from "axios";
import { serverConfig } from "../config/index.js";

export const getSession = async (req, res) => {
  try {
    const response = await axios.post(
      `${serverConfig.builderbotApi}/v1/get-session`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Builderbot response:", response.data);
    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
