const hardhat = require('hardhat');
const { expect } = require('chai');
const {getMappingPubdata} = require('./utils');

describe('Token mapping unit tests', function () {
    let token, zkSync, zkSyncBlock, zkSyncExit, governance, vault, zkl;
    let wallet,alice,bob;
    beforeEach(async () => {
        [wallet,alice,bob] = await hardhat.ethers.getSigners();
        // token
        const erc20Factory = await hardhat.ethers.getContractFactory('cache/solpp-generated-contracts/dev-contracts/ERC20.sol:ERC20');
        token = await erc20Factory.deploy(10000);
        // governance, alice is networkGovernor
        const governanceFactory = await hardhat.ethers.getContractFactory('Governance');
        governance = await governanceFactory.deploy();
        await governance.initialize(
            hardhat.ethers.utils.defaultAbiCoder.encode(['address'], [alice.address])
        );
        await governance.connect(alice).addToken(token.address, false); // tokenId = 1
        await governance.connect(alice).setValidator(bob.address, true); // set bob as validator
        // verifier
        const verifierFactory = await hardhat.ethers.getContractFactory('Verifier');
        const verifier = await verifierFactory.deploy();
        // Vault
        const vaultFactory = await hardhat.ethers.getContractFactory('Vault');
        vault = await vaultFactory.deploy();
        await vault.initialize(hardhat.ethers.utils.defaultAbiCoder.encode(['address'], [governance.address]));
        // ZkSync
        const contractFactory = await hardhat.ethers.getContractFactory('ZkLinkTest');
        zkSync = await contractFactory.deploy();
        // ZkSyncCommitBlock
        const zkSyncBlockFactory = await hardhat.ethers.getContractFactory('ZkLinkBlockTest');
        const zkSyncBlockRaw = await zkSyncBlockFactory.deploy();
        zkSyncBlock = zkSyncBlockFactory.attach(zkSync.address);
        // ZkSyncExit
        const zkSyncExitFactory = await hardhat.ethers.getContractFactory('ZkLinkExit');
        const zkSyncExitRaw = await zkSyncExitFactory.deploy();
        zkSyncExit = zkSyncExitFactory.attach(zkSync.address);
        await zkSync.initialize(
            hardhat.ethers.utils.defaultAbiCoder.encode(['address','address','address','address','address','bytes32'],
                [governance.address, verifier.address, vault.address, zkSyncBlockRaw.address, zkSyncExitRaw.address, hardhat.ethers.utils.arrayify("0x1b06adabb8022e89da0ddb78157da7c57a5b7356ccc9ad2f51475a4bb13970c6")])
        );
        await vault.setZkLinkAddress(zkSync.address);
        // zkl
        const zklFactory = await hardhat.ethers.getContractFactory('ZKL');
        zkl = await zklFactory.deploy("ZKLINK", "ZKL", 100000, alice.address, zkSync.address);
        await governance.connect(alice).addToken(zkl.address, true); // tokenId = 2
    });

    it('should revert when exodusMode is active', async () => {
        await zkSync.setExodusMode(true);
        await expect(zkSync.mappingToken(wallet.address, alice.address, 0, token.address, 1, 1, 100)).to.be.revertedWith("L");
    });

    it('token mapping should success', async () => {
        const toChainId = 2;
        const amount = hardhat.ethers.utils.parseEther("1");
        const to = bob.address;
        await token.connect(bob).mint(amount);
        await token.connect(bob).approve(zkSync.address, amount);

        await expect(zkSync.connect(bob).mappingToken(bob.address, to, amount, token.address, 1, 1, 100)).to.be.revertedWith("ZkLink: toChainId");
        await expect(zkSync.connect(bob).mappingToken(bob.address, to, amount, token.address, 2, 1, 100)).to.be.revertedWith("ZkLink: not mapping token");

        await governance.connect(alice).setTokenMapping(token.address, true);
        await zkSync.connect(bob).mappingToken(bob.address, to, amount, token.address, toChainId, 1, 100);
        expect(await token.balanceOf(vault.address)).equal(amount);
    });

    it('cancelOutstandingDepositsForExodusMode should success', async () => {
        const amount = 20;
        await token.connect(bob).mint(amount);
        await token.connect(bob).approve(zkSync.address, amount);
        await governance.connect(alice).setTokenMapping(token.address, true);
        await zkSync.connect(bob).mappingToken(bob.address, bob.address, amount, token.address, 2, 1, 1);

        const pubdata = getMappingPubdata({ fromChainId:'0x01',
            toChainId:'0x02',
            owner:bob.address,
            to:bob.address,
            tokenId:'0x0001',
            amount:'0x00000000000000000000000000000014',
            fee:'0x00000000000000000000000000000000',
            nonce:'0x00000001',
            withdrawFee:'0x0001' });
        await zkSync.setExodusMode(true);
        await zkSyncExit.cancelOutstandingDepositsForExodusMode(1, [pubdata]);
        await expect(zkSyncExit.connect(bob).withdrawPendingBalance(bob.address, token.address, 20)).to
            .emit(zkSync, 'Withdrawal')
            .withArgs(1, 20);
    });

    it('burn in from chain should success', async () => {
        const amount = 20;
        await zkl.connect(alice).mint(vault.address, amount);
        const pubdata = getMappingPubdata({ fromChainId:'0x01',
            toChainId:'0x02',
            owner:bob.address,
            to:bob.address,
            tokenId:'0x0002',
            amount:'0x00000000000000000000000000000014',
            fee:'0x00000000000000000000000000000001',
            nonce:'0x00000001',
            withdrawFee:'0x0001' });
        await zkSyncBlock.testExecMappingToken(pubdata);
        expect(await zkl.balanceOf(vault.address)).to.be.equal(1);
    });

    it('mint in to chain should success', async () => {
        const pubdata = getMappingPubdata({ fromChainId:'0x02',
            toChainId:'0x01',
            owner:bob.address,
            to:bob.address,
            tokenId:'0x0002',
            amount:'0x00000000000000000000000000000014',
            fee:'0x00000000000000000000000000000001',
            nonce:'0x00000001',
            withdrawFee:'0x0001'});
        await zkSyncBlock.testExecMappingToken(pubdata);
        expect(await zkl.balanceOf(bob.address)).to.be.equal(19);
    });
});
