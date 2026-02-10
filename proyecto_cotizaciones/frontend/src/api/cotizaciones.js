import axios from "axios";

export const crearCotizacion = async (payload) => {
  const token = localStorage.getItem("access_token");

  const { data } = await axios.post(
    `${import.meta.env.VITE_API_URL}/cotizaciones/guardar/`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return data;
};
