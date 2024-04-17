import { useEffect, useState } from "react";
import "./App.css";
import { SocketContext, socket } from "./content/socket";

// import html from "./test.html";
// var __html = require("./test.html");

const authToken = "";
function App() {
  const [customers, setCustomers] = useState("");
  const [orders, setOrders] = useState("");

  const getCustomers = async () => {
    fetch("http://localhost:4000/all-customer", {})
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data?.data);
      });
  };

  const getOrders = async () => {
    fetch("http://localhost:4000/all-orders", {})
      .then((res) => res.json())
      .then((data) => {
        setOrders(data?.data);
      });
  };

  useEffect(() => {
    if (orders && orders.length && customers && customers?.length) {
      console.log("customers?.length: ", customers?.length);
      const ordersWithCustomers = orders
        .filter((item) => item?.customer_id || item?.tenders?.[0]?.customer_id)
        ?.map((item) => {
          return {
            ...item,
            finalCustomerId:
              item?.customer_id || item?.tenders?.[0]?.customer_id,
          };
        });
      console.log("ordersWithCustomers: ", ordersWithCustomers.length);

      let customerWhichIsNotInAllCustomers = [];
      for (let i = 0; i < ordersWithCustomers.length; i++) {
        if (
          customers?.findIndex(
            (item) => item?.id === ordersWithCustomers[i]?.finalCustomerId
          ) === -1
        ) {
          customerWhichIsNotInAllCustomers.push(
            ordersWithCustomers[i]?.finalCustomerId
          );
        }
      }
      console.log(
        "customerWhichIsNotInAllCustomers: ",
        customerWhichIsNotInAllCustomers.length
      );

      const staticCustomer = "WH681ZTTHD2RSFFWRDSRXX68RC";
      console.log(
        "find specific customer",
        customers.find((item) => item?.id === staticCustomer)
      );

      console.log(
        "order by customer id",
        orders.filter(
          (item) =>
            item?.customer_id === staticCustomer ||
            item?.tenders?.[0]?.customer_id === staticCustomer
        )
      );
    }
  }, [customers, orders]);

  // useEffect(() => {
  //   getCustomers();
  //   getOrders();
  // }, []);
  return (
    <SocketContext.Provider value={socket}>
      <div className="App">
        <h1>socket</h1>

        {/* <iframe
          title="My title"
          style={{ height: 200, width: 200 }}
          src="https://app.snappic.com/slideshow/ERNB5?type=all&grid_width=1&grid_height=1&hide_nav=true"
        /> */}
      </div>
    </SocketContext.Provider>
  );
}

export default App;
