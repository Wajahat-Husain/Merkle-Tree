const express = require('express')
const bodyParser = require('body-parser');
const keccak256 = require("keccak256");
const { default: MerkleTree } = require("merkletreejs");
const fs = require("fs");

const app = express()
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000

app.post('/whiteListedAddress', async (req, res) => {
    try {

        const { address } = req.body;

        if (!Array.isArray(address)) {
            console.error('Address is not an array or is undefined.');
            res.status(500).send({status: 0, message:'Address is not an array or is undefined.'}); 
        }
        //  Hashing All Leaf Individual
        const leaves = await Promise.all(address.map(async (leaf) => {
            return keccak256(leaf);
        }))
        
        // Constructing Merkle Tree
        const tree = new MerkleTree(leaves, keccak256, {
            sortPairs: true,
        });

        //  Utility Function to Convert From Buffer to Hex
        const buf2Hex = (x) => "0x" + x.toString("hex");

        // Get Root of Merkle Tree
        console.log(`Here is Root Hash: ${buf2Hex(tree.getRoot())}`);

        let data = [];

        // Pushing all the proof and leaf in data array
        address.forEach((address) => {
            const leaf = keccak256(address);

            const proof = tree.getProof(leaf);

            let tempData = [];

            proof.map((x) => tempData.push(buf2Hex(x.data)));

            data.push({
                address: address,
                leaf: buf2Hex(leaf),
                proof: tempData,
            });
        });

        // Create WhiteList Object to write JSON file

        let whiteList = {
            whiteList: data,
        };

        //  Stringify whiteList object and formating
        const metadata = JSON.stringify(whiteList, null, 2);

        // Write whiteList.json file in root dir
        fs.writeFile(`whiteList.json`, metadata, (err) => {
            if (err) {
                throw err;
            }
        });

        res.status(200).send({ status: 1, message: "Root Hash created success", data: buf2Hex(tree.getRoot()) })

    } catch (err) {
        console.error(`error message:`)
        console.error(err)
        res.status(500).send({ status: 0, message: "Something went wrong", error: err.message })
    }

})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})