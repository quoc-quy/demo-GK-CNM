const TableName = 'products'
const Bucket = 'bucket-quy-leo'

const { ScanCommand, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb')
const { s3Client, dynamoDbClient } = require('./aws-config')
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')

// GET /products
const getAllProducts = async (req, res) => {
  try {
    const data = await dynamoDbClient.send(
      new ScanCommand({
        TableName
      })
    )

    res.status(200).json(data.Items)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /products/:id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params

    const data = await dynamoDbClient.send(
      new GetCommand({
        TableName,
        Key: { id }
      })
    )

    res.status(200).json(data.Item)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Upsert = Insert (create) + Update
// POST /products
// PUT /products/:id
const upsertProduct = async (req, res) => {
  try {
    // 1. Lấy thông tin
    const { id } = req.params // url
    const { name, price } = req.body // body, hỗ trợ TEXT/Number
    const file = req.file // body, hỗ trợ file/binary

    // 2.1 Tạo payload TH1 Tạo mới sp
    let productData = { id: Date.now().toString(), name, price }

    // 2.2 Tạo payload TH2 Cập nhật sp
    if (id) {
      const data = await dynamoDbClient.send(
        new GetCommand({
          TableName,
          Key: { id }
        })
      )

      if (!data.Item) throw new Error('Không tìm thấy sản phẩm')
      productData = { ...data.Item, name, price }
    }

    // 3. Cập nhật s3
    if (file) {
      // 3.1 Upload ảnh
      const key = `${Date.now()}-${file.originalname}`
      await s3Client.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        })
      )
      const image = `https://${Bucket}.s3.amazonaws.com/${key}`

      // 3.2 Xóa ảnh nếu có
      if (productData.image) {
        // ["https:", "", "${Bucket}.s3.amazonaws.com", "${key}"]

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket,
            Key: productData.image.split('/').pop()
          })
        )
      }

      productData.image = image
    }

    // 4. Đẩy lên Dynamodb
    await dynamoDbClient.send(
      new PutCommand({
        TableName,
        Item: productData
      })
    )

    res.status(200).json({ message: 'Thành công' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /products/:id
const deleteProductById = async (req, res) => {
  try {
    // 1. Lấy thông tin
    const { id } = req.params

    // 2. Lấy payload
    const data = await dynamoDbClient.send(
      new GetCommand({
        TableName,
        Key: { id }
      })
    )

    if (!data.Item) throw new Error('Không tìm thấy sản phẩm')

    // 3. Làm việc s3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket,
        Key: data.Item.image.split('/').pop()
      })
    )

    // 4. Làm việc dynamodb
    await dynamoDbClient.send(
      new DeleteCommand({
        TableName,
        Key: { id }
      })
    )

    res.status(200).json({ message: 'Thành công' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  upsertProduct,
  deleteProductById
}
