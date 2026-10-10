const express = require('express');
const router = express.Router();

const connection = require('../config/db');

//#region users

router.get('/users', (req, res) => {
    connection.query(`
        SELECT
            users.ID, name, surname, roles.role,
            COUNT(orders.ID) AS n_orders
        FROM users
        INNER JOIN roles ON users.roleID = roles.ID
        LEFT JOIN orders ON users.ID = orders.userID
        GROUP BY users.ID;
    `, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

router.get('/users/:userID', (req, res) => {
    const userID = req.params.userID;

    connection.query(`
        SELECT
            name, surname, roles.role,
            addresses.street, addresses.locality, addresses.city, addresses.province, addresses.state
        FROM users
        INNER JOIN roles ON users.roleID = roles.ID
        INNER JOIN addresses ON users.ID = addresses.userID
        WHERE users.ID = ?
        GROUP BY addresses.ID
    `, [userID], (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            var user = {
                name: results[0].name,
                surname: results[0].surname,
                role: results[0].role,
                addresses: []
            }

            results.forEach(r => {
                user.addresses.push({
                    street: r.street,
                    locality: r.locality,
                    city: r.city,
                    province: r.province,
                    state: r.state
                })
            })

            res.json(user);
        }
    });

});

router.get('/roles', (req, res) => {

    connection.query('SELECT ID, role FROM roles;', (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});


//#endregion

//#region orders

router.get('/orders', (req, res) => {
    const { userID, orderID } = req.query;

    var query = `
        SELECT
            orders.ID,
            orders.date,
            order_status.status,
            CONCAT(addresses.street, ', ', addresses.locality, ', ', addresses.city, ', ', addresses.province, ', ', addresses.state) AS address,
            SUM(order_datails.qty) AS n_products,
            SUM(order_datails.price) AS total_price,
            orders.shipping_fee
        FROM orders
        INNER JOIN order_status ON orders.statusID = order_status.ID
        INNER JOIN addresses ON orders.addressID = addresses.ID
        INNER JOIN order_datails ON orders.ID = order_datails.orderID
        INNER JOIN users ON orders.userID = users.ID`;

    var filter = [];
    var IDs = [];

    if (userID) {
        filter.push("orders.userID = ?");
        IDs.push(userID);
    }
    if (orderID) {
        filter.push("orders.ID = ?");
        IDs.push(parseInt(orderID));
    }

    if (filter.length > 0) {
        query += " WHERE " + filter.join(" AND ");
    }

    query += " GROUP BY orders.ID ORDER BY orders.date DESC, orders.statusID";

    connection.query(query, IDs, (error, results, fields) => {
        if (error) {
            console.error('Errore durante l\'esecuzione della query:', error);
            res.status(500).json({ error: 'Errore durante il recupero dei dati dal database' });
        } else {
            res.json(results);
        }
    });

});

//#endregion

module.exports = router;