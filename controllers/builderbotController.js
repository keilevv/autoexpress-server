import axios from "axios";
import { serverConfig } from "../config/index.js";

export const getSession = async (req, res) => {
  try {
    const response = await axios.get(
      `${serverConfig.builderbotApi}/v1/get-session`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
};
