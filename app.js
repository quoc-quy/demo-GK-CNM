const express = require('express')
const multer = require('multer')
const productController = require('./product-controller')

const app = express()

console.log('Hello1')
console.log('Hello2')
console.log('Hello3')

// Middleware
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const upload = multer({ storage: multer.memoryStorage() })

// Routes
app.get('/products', productController.getAllProducts)
app.get('/products/:id', productController.getProductById)
app.post('/products', upload.single('image'), productController.upsertProduct)
app.put('/products/:id', upload.single('image'), productController.upsertProduct)
app.delete('/products/:id', productController.deleteProductById)

// Run App
app.listen(3000, () => {
  console.log('Server is running on port 3000')
})
