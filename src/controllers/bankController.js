import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const bank = async (req,res)=>{

      const {name ,code ,maxLimit} = req.body;

      if( !name || !code || !maxLimit){
          return res.status(400).json({message:"Please provide all fields"});
      }
        try{
            const existingBank = await prisma.bank.findUnique({
                where:{
                    code:code,
                }
            });
    
            if(existingBank){
                return res.status(400).json({message:"Bank already exists"});
            }
    
            const bank = await prisma.bank.create({
                data:{
                    name,
                    code,
                    maxLimit,
                }
            });
    
            return res.status(201).json({message:"Bank created successfully", bank});
        }
        catch(error) {
            console.error(error);
            return res.status(500).json({message:"Internal server error"});
        }

}
export { bank};



