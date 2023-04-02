import crypto from 'crypto-js';
const { SHA256 } = crypto;

import elliptic from 'elliptic';
const ec = new elliptic.ec('secp256k1');

export class Transaction {
    constructor(from, to, amount, memo = '') {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.memo = memo;
    }

    calculateHash() {
        return SHA256(this.from + this.to + this.amount + this.memo).toString();
    }

    sign(key) {
        if (key.getPublic('hex') !== this.from) {
            throw new Error('Signer not authorized');
        }
        const txHash = this.calculateHash();
        this.signature = key.sign(txHash, 'base64');
    }

    isValid() {
        if (this.from === null) {
            return true;
        }

        if (!this.signature || this.signature.length === 0) {
            console.log(
                `No signature in transaction with hash ${this.calculateHash()}`
            );
            return false;
        }

        const publicKey = ec.keyFromPublic(this.from, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

export class Block {
    constructor(timestamp, transactions = [], previousHash = '') {
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = -1;
    }

    calculateHash() {
        return SHA256(
            this.previousHash +
                this.timestamp +
                JSON.stringify(this.transactions) +
                this.nonce
        ).toString();
    }

    mineBlock(difficulty) {
        while (
            this.hash.substring(0, difficulty) !==
            Array(difficulty + 1).join('0')
        ) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log('Block mined: ' + this.hash);
    }

    areTxValid() {
        return this.transactions.filter((t) => !t.isValid()).length === 0;
    }
}

export class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 3;
        this.pendingTransactions = [];
        this.miningReward = 100;
    }

    createGenesisBlock() {
        return new Block(Date.parse(0), [new Transaction(null, null, 0)], null);
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        if (
            this.pendingTransactions.filter((pt) => pt.from === null).length > 1
        ) {
            throw new Error('No more than one mining reward allowed');
        }
        let block = new Block(
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );
        block.mineBlock(this.difficulty);
        console.log('Success.');
        this.chain.push(block);
        this.pendingTransactions = [
            new Transaction(null, miningRewardAddress, this.miningReward),
        ];
    }

    createTransaction(transaction) {
        if (!transaction.isValid()) {
            throw new Error('Transaction signature not valid');
        }

        if (!transaction.to || !transaction.from) {
            throw new Error('Transaction must include source and destination');
        }
        this.pendingTransactions.push(transaction);
    }

    getBalanceOf(address) {
        let balance = 0;

        const arr = this.chain
            .map((block) =>
                block.transactions.filter(
                    (transaction) =>
                        transaction.to === address ||
                        transaction.from === address
                )
            )
            .flat()
            .forEach((transaction) => {
                if (transaction.from === address) {
                    balance -= transaction.amount;
                }
                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            });
        return balance;
    }

    isValid() {
        return (
            this.chain.filter((block, i) => {
                if (i === 0) {
                    return false;
                } else {
                    return (
                        block.hash !== block.calculateHash() ||
                        block.previousHash !== this.chain[i - 1].hash ||
                        !block.areTxValid()
                    );
                }
            }).length === 0
        );
    }
}
