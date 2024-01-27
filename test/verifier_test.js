const { expect } = require('chai');
const { BigNumber } = require("ethers");
const hardhat = require("hardhat");

describe('Verifier unit tests', function () {
    let recursiveVerifier, zkLinkVerifier, proof, oracleCommitment;
    before(async () => {
        const recursiveVerifierFactory = await hardhat.ethers.getContractFactory('Verifier');
        recursiveVerifier = await recursiveVerifierFactory.deploy();
        const exitVerifierFactory = await hardhat.ethers.getContractFactory('ExitVerifier');
        const exitVerifier = await exitVerifierFactory.deploy();
        const verifierFactory = await hardhat.ethers.getContractFactory('ZkLinkVerifier');
        zkLinkVerifier = await verifierFactory.deploy(await recursiveVerifier.getAddress(), await exitVerifier.getAddress(), hardhat.ethers.ZeroAddress);

        const oracleContent = {
            usedPythNum: 0,
            guardianSetIndex: 3,
            guardianSetHash: "0x0a4a9ab91e08bc93f3f763523379aec112754640fe1b0d3530bc3c4a7d7f4f3b",
            earliestPublishTime: 0
        };
        oracleCommitment = hardhat.ethers.solidityPackedKeccak256(["uint256","uint256","bytes32","uint256"],[oracleContent.usedPythNum, oracleContent.guardianSetIndex,oracleContent.guardianSetHash,oracleContent.earliestPublishTime]);
        console.log('oracleCommitment', oracleCommitment);
        const abiCoder = new hardhat.ethers.AbiCoder();
        const oracleContentBytes = abiCoder.encode(["uint256","uint256","bytes32","uint256"],[oracleContent.usedPythNum, oracleContent.guardianSetIndex,oracleContent.guardianSetHash,oracleContent.earliestPublishTime]);
        proof = {
            proof: [
                "0x29519e8786f0f901cb0e11468b0e27372d104f99780a1c14bced4ad0f6f0808a",
                "0x2359516f38800736670a1aa343f8c066c611e6beb2e6d018de2f855ae448eebe",
                "0x2bc5a4792b5d8587f123df252e403651444e2ec150f8fa664cc0a096da9a4bde",
                "0x22318d22a973599c09eb67dbc710a90544cd2d49d8694ab40aa5c7acdacbc0f7",
                "0x2bc8313e11e9931526cf8ffb96727430837b0570cae1296edd96d6f1bdf82061",
                "0x1daabf9118e0e41d5de156b2e0cc510302292df997e05d8c78627ac8f6a7264e",
                "0x2fc972d77cfd1f0b9110e87bf6bda92307ffa89c43553a83268efc30292cdfb0",
                "0xd0d2ef0d7de9235e4fa4f44d5cc2f848eaae0b227a5a157bdce80b4542349a9",
                "0xe5072135d909e266d6a070e508d3bcbc738730cc58305cf2bd8864809fae98e",
                "0x2cf169d23fa498873d3baee85163c4cdf08f09ca5099766441a596bec7c75ca7",
                "0x2387360905556fcd3d1f6d69dba4c99abe82ae9a837362503c013e1f58c6554e",
                "0x1489cd32a5ce075ec63193fda48223dc363e47317b8364d2be3c5c1d5122acc7",
                "0x19b662cf57d9c8cb78630bb002377b2cf5a4a12603a73bcc31c0fdb95aa1d56c",
                "0x5689f35ce0288785a79264e7ef82cb4909fe0b58026e1e6742f62ec36c58f89",
                "0x238b245c5d2831f364fb08601dbafbca50096d1eafd9a9515fddd7ca6f39a2a1",
                "0xaaf8432589e34c101def3ed64263aa1bd3e80441f9293b53bd08650ff2db7fb",
                "0x3045eee6a9906ce9dfe5fdbe9f69e7af86fd5a83cd422e25778476a744e5b0e3",
                "0x84ea996ee49c73867df2a25982c1c04e6c7c85592c470e133f584b979d82e47",
                "0x2bc6dd5ad66b7eed9f31f57a8484ca2a3e55ee601d7f8bfef2a087cf64d6e3a",
                "0x127a1d256bf5134a03f8cf56b4699c6577fdc7f422eded85ee7044829760f3bb",
                "0x2a4a3b5a232f0eb14430f5aa0528250525f3db35db6b80bccf8fc8c75b87d113",
                "0x2fc2c1844b5ab4f24c8e48027788eb4479c5f96d2e52e038861406e5c5cfbd09",
                "0x7b8285e7f2886ca1ebb17e765744bd3578acb435213ffb94bfb55ae869e0de0",
                "0x27f9c62d6977702c6d51bb87b5088fede1dd9eb00c7e8ce10d3057a906c5117b",
                "0x1f2a08c32350d06bd6e9a98111a9c0f4e60e0c4ac6fd6af2c241808b4d6b54b8",
                "0x1f02e4c58feaf82b7748c56da39d8203cf50fcb6be3a3f8910bf023721ac06f2",
                "0x2b08e641b6b5bfb04ae98f0d7e99bb2e031705f395ce25e66147e2b61795c4b",
                "0x24bcdc8f08c0cdaf48df3b2032627adf88499327ad65632c8defe621a69116eb",
                "0xd271563884b5a7e7fcdbd4f38ea56e58457640cc0a408b3225107b22e197f6a",
                "0x2971146de32bb04ddb5a21a748979be1797918e84a553f41da5d4d8af35af85c",
                "0x2caf73ad9128764528c0679839f1fb8d080fe59719892c9b9c368b4b852598b7",
                "0x259323c9b3405f2fb87f0b21b8f579fecf6933631ea71fe405f84f503340871",
                "0x3a7ce2e4c9d9d982c54638ad37b64bde34a2b3067899e659c9d1a645e144a32",
                "0x190a8c71f8421f8a440b46389a88ee6724c94ca2d5ebd5442433e1c728d10041",
                "0x2276e4238d47649d8f02b886fcd8cee8e831538adada258ec3f3cb320498227d",
                "0xa49b2e2a3c55399576a8bb2ab3e01d83dc3cb1da3b7507aee90e8fb10b25bcc",
                "0x2274de9de51c2affb1be6e53fb8d9fbe0b7054b5e75bb6f44cf16a3b16ce70db",
                "0x9a70f060fb6ef219b0bdb964921307e054c399cc67b86356c74bece26644dd9",
                "0x183fecd5304176210c4d4d93c6762e26c8e6d96c31ed236c3d7d862972c7b8c0",
                "0x2fd6e6fc1a0a390748a0e7b0149637bbd02e5a2bf6763674c8d5c10cc563fdb5",
                "0x269cc9eeaafa85e421f69a5bd631365e2336b723d51e7f789134432c82bf2918",
                "0x2c85824f70292e3b99d42303dfe581b7f7f5af0cc8594bbac927ba81506308be",
                "0x35a57678d2b313eb607859197bbc014fa1362cacf54a2fbc67ab683a8c1b6b7",
                "0x21aa9aa4422075859fab99b9ed5360c45d675aaa17f177209c65668edbdddc95",
            ],
            blockInputs: [
                "0x0000000000000000000000000000000000000000000000000000000000000001",
            ],
            subProofsLimbs: [
                "0x000000000000000000000000000000000000000000007fff126c8eb6248f1f64",
                "0x00000000000000000000000000000000000000000000556da40dc50b903b51cf",
                "0x000000000000000000000000000000000000000000002fa41dcf417211205b26",
                "0x0000000000000000000000000000000000000000000000000000000000002728",
                "0x00000000000000000000000000000000000000000000856e434cca15d9c352df",
                "0x00000000000000000000000000000000000000000000df013790eade7703737e",
                "0x00000000000000000000000000000000000000000000855cc84788ba2d314164",
                "0x0000000000000000000000000000000000000000000000000000000000001001",
                "0x000000000000000000000000000000000000000000000de13442f5401129ff86",
                "0x00000000000000000000000000000000000000000000cd24c85b854c33144d54",
                "0x000000000000000000000000000000000000000000004dd0aea5ee06e1f3defa",
                "0x0000000000000000000000000000000000000000000000000000000000001264",
                "0x0000000000000000000000000000000000000000000014e120480b4c9d390be0",
                "0x00000000000000000000000000000000000000000000c2a2d66a0737d882a590",
                "0x000000000000000000000000000000000000000000008f600c79f21dc72255f8",
                "0x00000000000000000000000000000000000000000000000000000000000016fc",
            ],
            oracleContent: oracleContentBytes
        };
    });

    it('get batch public input should success', async () => {
        const vksCommitment = "0x261b7548447191cb701ba0001391c666b3558146fd7810fc715535e22d1bbdf3";
        let publicInput = await zkLinkVerifier.getBatchProofPublicInput(vksCommitment, proof.blockInputs, oracleCommitment, proof.subProofsLimbs);
        console.log(publicInput);
        let success = await recursiveVerifier.verify([publicInput], proof.proof, proof.subProofsLimbs);
        console.log(success);
    });

    // it('verify gggregated block proof should success', async () => {
    //     let _proof = {
    //         recursiveInput: [
    //             BigInt("419677603415751010543046694216861168897793696682748438237227036798995564786")
    //         ],
    //         proof:[
    //             BigInt("19486615556134790294101282842511578125911600601638271936163609588748735271486"),
    //             BigInt("13578433002005982111648517686622689730307458361777254376934500836886797850105"),
    //             BigInt("10525895957087781469922664157346244854372570062025110134240366739722873492018"),
    //             BigInt("6598729692522500417343935947202957106446767031866527353821036042562850212993"),
    //             BigInt("10024030969911643905784947558215223947827743599360599284678794571586792698623"),
    //             BigInt("13117790217645948585186109110138569125656109357812500433347511969292079433217"),
    //             BigInt("14898207097052103863013905700713183149694477396540861416071083140555068666162"),
    //             BigInt("10709403054879840393440903156430854281246005473540029816477846810235910929966"),
    //             BigInt("10573501481747910593939571866144820490128014557381686841922582565814809305528"),
    //             BigInt("7947652356154195440483827869363847529997823169876410268324736643085714542648"),
    //             BigInt("5902452419114253180715086530981700845334955186148090782957215247054679683860"),
    //             BigInt("18655680020252039789786417872834011109021496927697710413161380672310230068122"),
    //             BigInt("14785766832090180261051471153423263015135912699467258887760051970993523969084"),
    //             BigInt("5637938403638929799139074624699914640792662200801121767354283120204837190916"),
    //             BigInt("7188230382609817200496258532627422638935924490020303644480295898366519290179"),
    //             BigInt("12984510860375922490199754964695803554208484029597851102555161990759157371013"),
    //             BigInt("18935809265959134879728894695950525404916920389870764636985991262389129086290"),
    //             BigInt("18644946167976425778420722344658031808746515793271434559752216130921346570327"),
    //             BigInt("10992718264986308785187632747184962868249479488929281900427005707535517727874"),
    //             BigInt("16655499981238550605665829077137796633742703738005534801002811491747298108513"),
    //             BigInt("14297683462093681894691361459083467979801321565072268492494058084574843126068"),
    //             BigInt("10189489417273218264047310542282381231505905555677043930183789207264702010855"),
    //             BigInt("10100760055237012684313311788718365109379995655896040426683374810602193892836"),
    //             BigInt("10980923913866943511331569890362154632887403200736180266365101117447525491460"),
    //             BigInt("10229634028765251198473488943705438256609036125001550306485994216415247684890"),
    //             BigInt("577110835343691533731919172725918899578701797779702765779402761733278275294"),
    //             BigInt("16653125809496172559192432081492026166934711979557566390723298628467974248108"),
    //             BigInt("318228218879071135740549704157395345740954008763396077890556021782683290909"),
    //             BigInt("13662675655469381722254953609908177730180713658163053607240715125325800612018"),
    //             BigInt("19256333320628940034191263710093762056312568779545957684796365284923725325620"),
    //             BigInt("3213700099058077027927244889326043389102682227792121517355435844339943277137"),
    //             BigInt("18681783291450329982701322624564603303103765844325572600678391244768735188491"),
    //             BigInt("5672466457673221638076241548309353530659734473378014835327422230835658564572"),
    //             BigInt("17276402788205493620767107767855993391003842700724712966471425203410290249601"),
    //         ],
    //         commitments:[
    //             BigInt("11648650371413193185315040493088702705613641746362788042742061625763085116501"),
    //             BigInt("9324595572265634142613217894866288349042253503331249643448016481366309214747"),
    //             BigInt("5502408353821133584759762565454032790213855157256917512080569840031184862369"),
    //             BigInt("13586767454294019856647880687061020974643987813883668989205380864247519265450"),
    //         ],
    //         vkIndexes: [ 0, 0, 2, 2 ],
    //         subproofsLimbs: [
    //             BigInt("230856937446521416213"),
    //             BigInt("294275801690920549537"),
    //             BigInt("51205152688462124999"),
    //             BigInt("785560160000218"),
    //             BigInt("115614729814030381128"),
    //             BigInt("129712188290360159251"),
    //             BigInt("36103478593267717445"),
    //             BigInt("603303054495509"),
    //             BigInt("206479719181154340772"),
    //             BigInt("263643108203484283615"),
    //             BigInt("152933702597664052655"),
    //             BigInt("24141586126922"),
    //             BigInt("16209064316716427495"),
    //             BigInt("180152222549864167814"),
    //             BigInt("65247077175298316090"),
    //             BigInt("168238866116540"),
    //         ]
    //     };
    //     expect(await verifier.verifyAggregatedBlockProof(
    //         _proof.recursiveInput,
    //         _proof.proof,
    //         _proof.vkIndexes,
    //         _proof.commitments,
    //         _proof.subproofsLimbs)).to.eq(true);
    // });
});
