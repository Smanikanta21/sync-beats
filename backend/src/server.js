const app = require('./app');

const Port = process.env.PORT || 5001;

app.listen(Port, () => {
    console.log(`Server running on http://localhost:${Port}`);
})