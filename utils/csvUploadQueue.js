const fastq = require("fastq");
const csv = require("csv-parser");
const { Readable } = require("stream");
const StorageMaterial = require("../models/storageMaterialModel");
const Notification = require("../models/notificationModel");
const { notificationEmitter } = require("../controllers/notificationController");

const headerMap = {
  name: "name", reference: "reference", unit: "unit", quantity: "quantity",
  price: "price", owner: "owner", caution_quantity: "caution_quantity",
  is_color: "is_color", normalized_weight: "normalized_weight",
  nombre: "name", referencia: "reference", unidad: "unit", cantidad: "quantity",
  precio: "price", propietario: "owner", dueño: "owner",
  cantidad_precaucion: "caution_quantity", cantidad_critica: "caution_quantity",
  es_color: "is_color", peso_normalizado: "normalized_weight",
};

async function worker(task) {
  const { bufferString, userId } = task;
  
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(bufferString);

    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) => {
            const lowerHeader = header.toLowerCase().trim();
            return headerMap[lowerHeader] || lowerHeader;
          },
        })
      )
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          const materialsToSave = results.map((item) => {
            return {
              name: item.name, reference: item.reference, unit: item.unit,
              quantity: Number(item.quantity) || 0, price: Number(item.price) || 0,
              owner: item.owner || "autoexpress", caution_quantity: Number(item.caution_quantity) || 0,
              is_color: item.is_color === "true" || item.is_color === true || item.is_color === "sí" || item.is_color === "si",
              normalized_weight: Number(item.normalized_weight) || 0,
            };
          });

          const savedMaterials = await StorageMaterial.insertMany(materialsToSave);
          
          // Create Notification
          const notification = await Notification.create({
            title: "Inventario Subido Exitosamente",
            description: `Se han procesado e importado ${savedMaterials.length} materiales.`,
            link: "/operations/settings/inventory",
            users: [userId],
          });

          // Trigger SSE
          notificationEmitter.emit("new_notification", notification);
          
          resolve(savedMaterials);
        } catch (error) {
          console.error("Queue Worker Error:", error);
          
          const notification = await Notification.create({
            title: "Error al importar inventario",
            description: error.message || "Hubo un error procesando el archivo CSV.",
            users: [userId],
          });
          notificationEmitter.emit("new_notification", notification);
          
          reject(error);
        }
      })
      .on("error", async (error) => {
        console.error("CSV Stream Error:", error);
        const notification = await Notification.create({
          title: "Error al leer el archivo CSV",
          description: error.message || "Formato de archivo inválido.",
          users: [userId],
        });
        notificationEmitter.emit("new_notification", notification);
        reject(error);
      });
  });
}

const queue = fastq.promise(worker, 1); // 1 concurrency

module.exports = queue;
