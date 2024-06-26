import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Post} from "../entity/Post";
import { User } from "../entity/User";
import multer from "multer";
import { authenticate } from "../utils/auth";
import { uploadImage, getSignedUrl } from "../utils/cloudStorage";
import CustomRequest from "../types/request";


const router = Router();
const postRepository = AppDataSource.getRepository(Post);
const userRepository = AppDataSource.getRepository(User);
const upload = multer({ storage: multer.memoryStorage() });


// Create post and (upload image)
router.post('/upload', authenticate, upload.single('image'), async (req: CustomRequest, res) => {
    const { title, caption } = req.body;
    const authenticatedUser = req.user as User;

    if (!title) return res.status(400).json({ message: 'Title is required' })

    try {
        // Upload image to Google Cloud Storage
        const filePath = req.file ? await uploadImage(req.file) : null;

        const postData : Partial<Post> = {
            title, caption, user: authenticatedUser
        }

        if (filePath) {
            postData.image = filePath;
        }

        const post = postRepository.create(postData);
        const savedPost = await postRepository.save(post);

        console.log("Successfully uploaded image and created post");
        res.status(201).json(savedPost);
    } catch (err) {
        if (err instanceof Error) {
            res.status(400).json({ message: err.message });
        } else {
            res.status(400).json({ message: 'An unknown error occurred.' });
            console.log("An unknown error occurred while uploading image and creating post.");
        }
    }
});

// Retrieve images uploaded
router.get('/posts', authenticate, async (req: CustomRequest, res) => {
    const authenticatedUser = req.user as User;
    const authenticatedUserData = await userRepository.findOne({ where: { username: authenticatedUser.username }, relations: ['partner']});
    if (!authenticatedUserData) return res.status(400).json({ message: 'User not found.' });
    if (!authenticatedUserData.partner) return res.status(400).json({ message: 'You do not have a partner to view posts.' });
  
    try {
      const userPosts = await postRepository.find({ where: { user: authenticatedUser }, relations: ['user'] });
      const partnerPosts = await postRepository.find({ where: { user: authenticatedUserData.partner}, relations: ['user'] });
      const allPosts = [...userPosts, ...partnerPosts];
  
      // Generate signed URLs for each post
      const postsWithSignedUrls = await Promise.all(
        allPosts.map(async (post) => {
            const signedUrl = post.image ? await getSignedUrl(post.image) : null;
            return {
                ...post, 
                imageUrl: signedUrl,
                mine: authenticatedUser.id === post.user.id
            };
        })
      );
  
      res.json(postsWithSignedUrls);
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(400).json({ message: 'An unknown error occurred.' });
        console.log("An unknown error occurred while retrieving posts.");
      }
    }
  });

export default router;