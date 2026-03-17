// Force Google DNS for SRV record resolution (MongoDB Atlas)
// Must be imported before any MongoDB connection
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
