import { Blockchain, Block, Transaction } from './blockchain';
import elliptic from 'elliptic';
const ec = new elliptic.ec('secp256k1');

describe('Transaction', () => {
    test('is valid if sender address is null', () => {
        const receiver = ec.genKeyPair().getPublic('hex');
        const tx = new Transaction(null, receiver, 100);
        expect(tx.isValid()).toBe(true);
    });

    test('is invalid if sender did not sign', () => {
        const sender = ec.genKeyPair().getPublic('hex');
        const receiver = ec.genKeyPair().getPublic('hex');
        const tx = new Transaction(sender, receiver, 1000);

        expect(tx.isValid()).toBe(false);
    });

    test('is invalid if signature length is zero', () => {
        const sender = ec.genKeyPair().getPublic('hex');
        const receiver = ec.genKeyPair().getPublic('hex');
        const tx = new Transaction(sender, receiver, 1000);

        tx.signature = '';

        expect(tx.isValid()).toBe(false);
    });

    test('throws error if signer is not sender', () => {
        const sender = ec.genKeyPair().getPublic('hex');
        const receiver = ec.genKeyPair().getPublic('hex');
        const signer = ec.genKeyPair();
        const tx = new Transaction(sender, receiver, 1000, 'lol thanks!');

        expect(() => tx.sign(signer)).toThrow('Signer not authorized');
    });
});

describe('Block', () => {
    test('is valid when mined with default parameters', () => {
        const block = new Block(Date.now());
        block.mineBlock(1);

        expect(block.areTxValid()).toBe(true);
        expect(block.calculateHash()).toBe(block.hash);
    });
});

describe('Blockchain', () => {
    test('is valid after normal transaction', () => {
        const pk = ec.genKeyPair();
        const sender = pk.getPublic('hex');
        const receiver = ec.genKeyPair().getPublic('hex');
        const tx1 = new Transaction(sender, receiver, 10);
        tx1.sign(pk);
        const chain = new Blockchain();
        chain.difficulty = 1;

        chain.minePendingTransactions(sender);
        chain.createTransaction(tx1);
        chain.minePendingTransactions(sender);

        expect(chain.isValid()).toBe(true);
        expect(chain.getBalanceOf(sender)).toBe(90);
        expect(chain.getBalanceOf(receiver)).toBe(10);
    });

    test('detects tampering', () => {
        const pk = ec.genKeyPair();
        const myWallet = pk.getPublic('hex');
        const targetWallet = ec.genKeyPair().getPublic('hex');
        const tx1 = new Transaction(myWallet, targetWallet, 10);
        tx1.sign(pk);
        const chain = new Blockchain();
        chain.difficulty = 1;

        chain.minePendingTransactions(myWallet);
        chain.createTransaction(tx1);
        chain.minePendingTransactions(myWallet);
        chain
            .getLatestBlock()
            .transactions.push(new Transaction(null, myWallet, 45));

        expect(chain.isValid()).toBe(false);
    });

    test('throws error if unsigned transaction is added to pending transactions', () => {
        const chain = new Blockchain();
        chain.difficulty = 1;
        const sender = ec.genKeyPair().getPublic('hex');
        const receiver = ec.genKeyPair().getPublic('hex');
        const tx = new Transaction(sender, receiver, 1000);

        expect(() => chain.createTransaction(tx)).toThrow(
            'Transaction signature not valid'
        );
    });

    test('throws an error if receiver address is empty', () => {
        const chain = new Blockchain();
        chain.difficulty = 1;
        const sender = ec.genKeyPair();
        const tx = new Transaction(sender.getPublic('hex'), '', 1000);
        tx.sign(sender);

        expect(() => chain.createTransaction(tx)).toThrow(
            'Transaction must include source and destination'
        );
    });

    test('throws an error if sender address is null', () => {
        const chain = new Blockchain();
        chain.difficulty = 1;
        const receiver = ec.genKeyPair().getPublic('hex');
        const tx = new Transaction(null, receiver, 1000);

        expect(() => chain.createTransaction(tx)).toThrow(
            'Transaction must include source and destination'
        );
    });

    test('is invalid if multiple mining reward transactions are pending', () => {
        const chain = new Blockchain();
        chain.difficulty = 1;
        const receiver1 = ec.genKeyPair().getPublic('hex');
        const receiver2 = ec.genKeyPair().getPublic('hex');
        const tx1a = new Transaction(null, receiver1, chain.miningReward);
        const tx2a = new Transaction(null, receiver2, chain.miningReward);
        const tx2b = new Transaction(null, receiver2, chain.miningReward);

        chain.pendingTransactions.push(tx1a, tx2a, tx2b);
        expect(() => chain.minePendingTransactions(receiver1)).toThrow(
            'No more than one mining reward allowed'
        );
    });
});
